import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { trips, photos } from "../api";
import { useToast } from "../components/Toast";
import AskAI from "../components/AskAI";

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
      </div>

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
        <div className="photo-modal-overlay" onClick={() => setNearbyActivity(null)}>
          <div className="photo-modal nearby-modal" onClick={(e) => e.stopPropagation()}>
            <div className="photo-modal-header">
              <h3>&#127758; Nearby Alternatives for "{nearbyActivity.name}"</h3>
              <button className="photo-modal-close" onClick={() => setNearbyActivity(null)}>&times;</button>
            </div>
            <p className="form-hint" style={{ marginBottom: 16 }}>
              {nearbyActivity.reason || "Quick alternatives nearby if you&apos;re short on time."}
            </p>
            <div className="nearby-grid">
              {(nearbyActivity.nearby_alternatives || []).map((alt, ai) => (
                <div key={ai} className="alternative-card">
                  <div className="alternative-card-header">
                    <strong>{alt.name}</strong>
                    {alt.category && <span className={`activity-category ${getCategoryClass(alt.category)}`}>{alt.category}</span>}
                  </div>
                  <p className="alternative-desc">{alt.description}</p>
                  <div className="alternative-meta">
                    <span>&#9200; {alt.duration}</span>
                    {alt.cost && <span>&#128176; {alt.cost}</span>}
                  </div>
                  {alt.reason && <p className="alternative-reason">&#128161; {alt.reason}</p>}
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: "100%", marginTop: 8 }}
                    onClick={async () => {
                      await handleApply(nearbyActivity.dayIndex, {
                        action: "swap",
                        activity_index: nearbyActivity.activityIndex,
                        alternative_index: ai,
                      });
                      setNearbyActivity(null);
                    }}
                  >
                    Use This Instead
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
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
