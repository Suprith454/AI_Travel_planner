import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { trips, photos, nearby } from "../api";
import { useToast } from "../components/Toast";
import AskAI from "../components/AskAI";
import BudgetSummary from "../components/BudgetSummary";
import WeatherPanel from "../components/WeatherPanel";
import NearbyModal from "../components/NearbyModal";
import { exportTripPdf } from "../utils/exportPdf";

function TripView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoModal, setPhotoModal] = useState(null);
  const [photoResults, setPhotoResults] = useState([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [mapModal, setMapModal] = useState(null);
  const [nearbyActivity, setNearbyActivity] = useState(null);
  const [applying, setApplying] = useState(null);
  const [shareModal, setShareModal] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [showHotels, setShowHotels] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const userMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const watchIdRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    loadTrip();
  }, [id]);

  const fetchRoute = useCallback((map, fromLat, fromLng, toLat, toLng) => {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&overview=full`;
    fetch(osrmUrl)
      .then((r) => r.json())
      .then((data) => {
        if (data.code === "Ok" && data.routes.length > 0) {
          if (routeLayerRef.current) {
            map.removeLayer(routeLayerRef.current);
          }
          routeLayerRef.current = L.geoJSON(data.routes[0].geometry, {
            style: { color: "#4f46e5", weight: 4, opacity: 0.8 },
          }).addTo(map);

          const bounds = L.latLngBounds([
            [fromLat, fromLng],
            [toLat, toLng],
          ]);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapModal || !mapRef.current) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    userMarkerRef.current = null;
    routeLayerRef.current = null;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
    }).addTo(map);

    L.marker([mapModal.lat, mapModal.lng])
      .addTo(map)
      .bindPopup(`<b>${mapModal.name}</b>`)
      .openPopup();

    map.setView([mapModal.lat, mapModal.lng], 14);

    mapInstance.current = map;

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lng]);
          } else {
            const blueIcon = L.divIcon({
              html: '<div style="width:20px;height:20px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
              className: "",
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });
            userMarkerRef.current = L.marker([lat, lng], { icon: blueIcon })
              .addTo(map)
              .bindPopup("<b>Your Location</b>")
              .openPopup();
          }

          fetchRoute(map, lat, lng, mapModal.lat, mapModal.lng);
        },
        (err) => {
          if (err.code === 1) {
            addToast("Location access denied. Showing destination only.", "warning");
            map.setView([mapModal.lat, mapModal.lng], 14);
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    } else {
      addToast("Geolocation not supported on this device.", "warning");
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      userMarkerRef.current = null;
      routeLayerRef.current = null;
    };
  }, [mapModal, fetchRoute, addToast]);

  const loadTrip = async () => {
    try {
      const data = await trips.get(id);
      setTrip(data);
    } catch (err) {
      addToast("Failed to load trip", "error");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (dayIndex, patchBody) => {
    setApplying(`${dayIndex}-${patchBody.action}`);
    try {
      const updated = await trips.patch(id, { day_index: dayIndex, ...patchBody });
      setTrip(updated);
      addToast("Schedule updated!", "success");
    } catch {
      addToast("Failed to apply change", "error");
    } finally {
      setApplying(null);
    }
  };

  const openPhotos = async (place) => {
    setPhotoModal(place);
    setPhotoResults([]);
    setPhotoLoading(true);
    try {
      const data = await photos.search(place);
      setPhotoResults(data.results || []);
    } catch {
      addToast("Failed to load photos", "error");
      setPhotoResults([]);
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleShare = async () => {
    setShareLoading(true);
    try {
      const res = await trips.share(id);
      const link = `${window.location.origin}/shared/${res.share_token}`;
      setShareLink(link);
      setShareModal(true);
    } catch {
      addToast("Failed to generate share link", "error");
    } finally {
      setShareLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await exportTripPdf(trip);
      addToast("PDF downloaded!", "success");
    } catch {
      addToast("Failed to generate PDF", "error");
    }
  };

  const loadHotels = async () => {
    if (hotels.length > 0) { setShowHotels(!showHotels); return; }
    setHotelsLoading(true);
    try {
      const firstDay = days[0]?.activities?.[0];
      if (!firstDay?.lat) {
        addToast("No location data available", "error");
        return;
      }
      const res = await nearby.search(firstDay.lat, firstDay.lng, 2000, "hotel");
      setHotels(res.places || []);
      setShowHotels(true);
    } catch {
      addToast("Failed to load hotels", "error");
    } finally {
      setHotelsLoading(false);
    }
  };

  const getCategoryClass = (cat) => {
    const c = (cat || "").toLowerCase();
    if (c.includes("food") || c.includes("restaurant") || c.includes("dining") || c.includes("meal")) return "food";
    if (c.includes("sight") || c.includes("tour") || c.includes("landmark") || c.includes("view")) return "sightseeing";
    if (c.includes("adventure") || c.includes("hike") || c.includes("trek") || c.includes("outdoor")) return "adventure";
    if (c.includes("culture") || c.includes("museum") || c.includes("history") || c.includes("art") || c.includes("heritage")) return "culture";
    if (c.includes("shop") || c.includes("market") || c.includes("mall")) return "shopping";
    if (c.includes("spa") || c.includes("relax") || c.includes("beach") || c.includes("park")) return "relaxation";
    if (c.includes("night") || c.includes("bar") || c.includes("club") || c.includes("party")) return "nightlife";
    return "other";
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="skeleton skeleton-text" style={{ width: 100, marginBottom: 24 }} />
        <div className="skeleton skeleton-text-lg" />
        <div className="flex flex-wrap gap-2 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-badge" />
          ))}
        </div>
        <div className="skeleton skeleton-day" />
        <div className="skeleton skeleton-day" />
      </div>
    );
  }
  if (!trip) return null;

  const days = trip.itinerary?.days || [];

  return (
    <div className="main-content">
      <button className="back-btn" onClick={() => navigate("/")}>
        &larr; Back to My Trips
      </button>

      <div className="trip-header">
        <h2>{trip.title}</h2>
        <div className="trip-meta">
          <span className="trip-meta-badge location">&#128205; {trip.destination}</span>
          {trip.start_date && <span className="trip-meta-badge date">&#128197; {trip.start_date} &rarr; {trip.end_date}</span>}
          {trip.budget && <span className="trip-meta-badge budget">&#128176; {trip.budget}</span>}
          {trip.interests && trip.interests.split(",").map((i, idx) => (
            <span key={idx} className="trip-meta-badge interest">&#127775; {i.trim()}</span>
          ))}
        </div>
        <div className="trip-actions">
          <button className="btn btn-outline btn-sm" onClick={handleDownloadPdf}>&#128196; PDF</button>
          <button className="btn btn-outline btn-sm" onClick={handleShare} disabled={shareLoading}>
            {shareLoading ? <span className="spinner spinner-sm" /> : "\u{1F517}"} Share
          </button>
          <button className="btn btn-outline btn-sm" onClick={loadHotels}>
            {hotelsLoading ? <span className="spinner spinner-sm" /> : "\u{1F3E8}"} Hotels
          </button>
        </div>
      </div>

      <BudgetSummary trip={trip} />

      {shareModal && (
        <div className="photo-modal-overlay" onClick={() => setShareModal(false)}>
          <div className="photo-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="photo-modal-header">
              <h3>&#128279; Share Trip</h3>
              <button className="photo-modal-close" onClick={() => setShareModal(false)}>&times;</button>
            </div>
            <p className="form-hint" style={{ marginBottom: 12 }}>Anyone with this link can view your trip (no login needed).</p>
            <div className="share-link-row">
              <input className="share-link-input" readOnly value={shareLink} onClick={(e) => e.target.select()} />
              <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard.writeText(shareLink); addToast("Link copied!", "success"); }}>
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {showHotels && hotels.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>&#127968; Nearby Hotels</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setShowHotels(false)}>Close</button>
          </div>
          <div className="hotels-grid">
            {hotels.map((h, i) => (
              <div key={i} className="hotel-card">
                <div className="hotel-card-name">{h.name}</div>
                <div className="hotel-card-meta">
                  <span>&#128205; {h.distance_m}m away</span>
                  {h.category && <span className={`activity-category ${h.category === "hotel" ? "sightseeing" : getCategoryClass(h.category)}`}>{h.category}</span>}
                </div>
                {h.lat && h.lng && (
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => setMapModal(h)}>
                    &#128506; View on Map
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Itinerary</h3>
          <span className="text-muted" style={{ fontSize: 13 }}>{days.length} day{days.length !== 1 ? "s" : ""}</span>
        </div>
        {days.length === 0 ? (
          <p className="text-muted">No itinerary details available.</p>
        ) : (
          days.map((day, di) => (
            <div key={day.day} className="day-card">
              <div className="day-card-header">
                <h3>
                  <span className="day-number">{day.day}</span>
                  Day {day.day}
                </h3>
                <WeatherPanel
                  lat={day.activities?.[0]?.lat}
                  lng={day.activities?.[0]?.lng}
                  dayLabel={`Day ${day.day}`}
                />
              </div>
              {day.date && <span className="day-date" style={{ display: "block", marginBottom: 12 }}>{day.date}</span>}

              {day.activities.map((act, i) => (
                <div key={i}>
                  <div className="activity">
                    <div className="activity-row">
                      {act.time && <div className="activity-time">{act.time}</div>}
                      <div className="activity-content">
                        <div className="activity-name">
                          {act.name}
                          {act.duration && <span className="activity-duration">&#9200; {act.duration}</span>}
                          {act.category && (
                            <span className={`activity-category ${getCategoryClass(act.category)}`}>
                              {act.category}
                            </span>
                          )}
                        </div>
                        {act.description && <div className="activity-desc">{act.description}</div>}
                        <div className="activity-footer">
                          <div className="flex items-center gap-2">
                            {act.cost && <div className="activity-cost">&#128176; {act.cost}</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            {act.nearby_alternatives && act.nearby_alternatives.length > 0 && (
                              <button
                                className="btn btn-outline btn-sm btn-nearby"
                                onClick={() => setNearbyActivity({ dayIndex: di, activityIndex: i, ...act })}
                              >
                                &#127758; Nearby
                              </button>
                            )}
                            {act.lat != null && act.lng != null && (
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setMapModal(act)}
                              >
                                &#128506; Map
                              </button>
                            )}
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => openPhotos(act.name)}
                            >
                              &#128247; Photos
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {act.next_transit && (
                    <div className={`transit-indicator ${act.next_transit.mode}`}>
                      <span className="transit-line" />
                      <span className="transit-label">
                        {act.next_transit.mode === "walk" ? "\u{1F6B6}" : "\u{1F697}"} {act.next_transit.minutes} min {act.next_transit.mode}
                        {act.next_transit.distance_km != null && ` \u00B7 ${act.next_transit.distance_km} km`}
                      </span>
                      <span className="transit-line" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {nearbyActivity && (
        <NearbyModal
          activity={nearbyActivity}
          dayIndex={nearbyActivity.dayIndex}
          onClose={() => setNearbyActivity(null)}
          onSwap={handleApply}
        />
      )}

      {photoModal && (
        <div className="photo-modal-overlay" onClick={() => setPhotoModal(null)}>
          <div className="photo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="photo-modal-header">
              <h3>&#128247; {photoModal}</h3>
              <button className="photo-modal-close" onClick={() => setPhotoModal(null)}>&times;</button>
            </div>
            {photoLoading ? (
              <div className="photo-loading">
                <div className="spinner" style={{ margin: "0 auto 12px" }} />
                <p>Loading photos...</p>
              </div>
            ) : photoResults.length === 0 ? (
              <p className="photo-empty">No photos found.</p>
            ) : (
              <div className="photo-grid">
                {photoResults.map((photo, i) => (
                  <a key={i} href={photo.urls?.regular} target="_blank" rel="noopener noreferrer">
                    <img
                      src={photo.urls?.small}
                      alt={photo.alt_description || photoModal}
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {mapModal && (
        <div className="photo-modal-overlay" onClick={() => setMapModal(null)}>
          <div className="photo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="photo-modal-header">
              <h3>&#128506; {mapModal.name}</h3>
              <button className="photo-modal-close" onClick={() => setMapModal(null)}>&times;</button>
            </div>
            <div
              ref={mapRef}
              style={{ height: 400, borderRadius: 12, overflow: "hidden" }}
            />
            <p className="form-hint" style={{ marginTop: 8, textAlign: "center" }}>
              Blue line shows live driving route from your location. Your position updates in real time as you move.
            </p>
          </div>
        </div>
      )}

      <AskAI tripId={id} />
    </div>
  );
}

export default TripView;
