import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { trips, nearby, tools } from "../api";
import { useToast } from "../components/Toast";
import { useAuth } from "../AuthContext";
import BudgetSummary from "../components/BudgetSummary";
import WeatherPanel, { CONDITION_LABELS } from "../components/WeatherPanel";
import NearbyModal from "../components/NearbyModal";
import { exportTripPdf } from "../utils/exportPdf";

function TripView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapModal, setMapModal] = useState(null);
  const [nearbyActivity, setNearbyActivity] = useState(null);
  const [applying, setApplying] = useState(null);
  const [shareModal, setShareModal] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [emailShareModal, setEmailShareModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailShareLoading, setEmailShareLoading] = useState(false);
  const { user } = useAuth();
  const [hotels, setHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [showHotels, setShowHotels] = useState(false);
  const [hiddenGems, setHiddenGems] = useState(null);
  const [gemsLoading, setGemsLoading] = useState(false);
  const [showGems, setShowGems] = useState(false);
  const [dayWeather, setDayWeather] = useState({});
  const [emergencyData, setEmergencyData] = useState(null);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
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

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
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
      loadEmergency(data.destination);
    } catch (err) {
      addToast("Failed to load trip", "error");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadEmergency = async (destination) => {
    setEmergencyLoading(true);
    try {
      const country = destination.split(",").pop().trim().toLowerCase();
      const data = await tools.emergency(country);
      setEmergencyData(data);
    } catch {
      // silently fail
    } finally {
      setEmergencyLoading(false);
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

  const classifyHotel = (name, cat) => {
    const n = (name + " " + (cat || "")).toLowerCase();
    if (/resort|palace|grand|luxury|5-star|five star|premium|boutique|ritz|marriott.*luxury/.test(n)) return "luxury";
    if (/inn|lodge|motel|hostel|budget|economy|2-star|two star|backpacker/.test(n)) return "budget";
    return "mid";
  };

  const TIER_BADGES = { budget: { label: "Budget", class: "tier-budget" }, mid: { label: "Mid", class: "tier-mid" }, luxury: { label: "Luxury", class: "tier-luxury" } };

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
      const withTiers = (res.places || []).map((h) => ({ ...h, tier: classifyHotel(h.name, h.category) }));
      setHotels(withTiers);
      setShowHotels(true);
    } catch {
      addToast("Failed to load hotels", "error");
    } finally {
      setHotelsLoading(false);
    }
  };

  const loadHiddenGems = async () => {
    if (hiddenGems) { setShowGems(!showGems); return; }
    setGemsLoading(true);
    try {
      const res = await tools.hiddenGems(trip.destination);
      setHiddenGems(res);
      setShowGems(true);
    } catch {
      addToast("Failed to load hidden gems", "error");
    } finally {
      setGemsLoading(false);
    }
  };

  const isIndoorActivity = (cat) => {
    const c = (cat || "").toLowerCase();
    return c.includes("museum") || c.includes("food") || c.includes("restaurant") || c.includes("shop") || c.includes("mall") || c.includes("culture") || c.includes("art") || c.includes("spa") || c.includes("cooking");
  };

  const getWeatherTip = (dayNum, cat) => {
    const cond = dayWeather[dayNum];
    const info = CONDITION_LABELS[cond];
    if (!info) return null;
    const indoor = isIndoorActivity(cat);
    if (cond === "rainy" && indoor) return { icon: "\u{1F44D}", tip: "Great indoor choice for rainy weather" };
    if (cond === "rainy" && !indoor) return { icon: "\u{1F327}\uFE0F", tip: "Consider indoor alternative" };
    if (cond === "hot" && indoor) return { icon: "\u{2744}\uFE0F", tip: "Cool indoor break from heat" };
    if (cond === "hot" && !indoor) return { icon: "\u2600\uFE0F", tip: "Avoid midday heat" };
    if (cond === "pleasant" && !indoor) return { icon: "\u{1F31E}", tip: "Perfect outdoor weather" };
    if (cond === "warm" && !indoor) return { icon: "\u{1F31E}", tip: "Great for outdoor activities" };
    return null;
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
            {shareLoading ? <span className="spinner spinner-sm" /> : "\u{1F517}"} Copy Link
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setEmailShareModal(true)}>
            {"\u2709\uFE0F"} Email
          </button>
          <button className="btn btn-outline btn-sm future-hover" data-tip="Future Enhancement" onClick={loadHotels}>
            {hotelsLoading ? <span className="spinner spinner-sm" /> : "\u{1F3E8}"} Hotels
          </button>
          <button className="btn btn-outline btn-sm future-hover" data-tip="Future Enhancement" onClick={loadHiddenGems}>
            {gemsLoading ? <span className="spinner spinner-sm" /> : "\u{1F48E}"} Hidden Gems
          </button>
        </div>
      </div>

      <BudgetSummary trip={trip} />

      <div className="card safety-card">
        <div className="safety-card-header" onClick={() => setShowSafety(!showSafety)} style={{ cursor: "pointer" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="safety-shield">&#128737;</span> Safety & Travel Info
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {emergencyLoading && <span className="spinner spinner-sm" />}
            <span className={`safety-chevron ${showSafety ? "open" : ""}`}>&#9660;</span>
          </div>
        </div>
        {showSafety && emergencyData && (
          <div className="safety-content">
            <div className="safety-numbers">
              <h4 className="safety-section-title">Emergency Numbers</h4>
              <div className="safety-numbers-grid">
                {Object.entries(emergencyData.emergency_numbers).map(([key, val]) => (
                  <div key={key} className="safety-number-item">
                    <span className="safety-service">{key.replace(/_/g, " ")}</span>
                    <span className="safety-number">{val}</span>
                  </div>
                ))}
              </div>
            </div>
            {emergencyData.embassy_info?.note && (
              <div className="safety-embassy">
                <span className="safety-embassy-icon">&#127758;</span>
                <span>{emergencyData.embassy_info.note}</span>
              </div>
            )}
            <div className="safety-tips">
              <h4 className="safety-section-title">Safety Tips</h4>
              <div className="safety-tips-list">
                {emergencyData.safety_tips.map((tip, i) => (
                  <div key={i} className="safety-tip-item">
                    <span className="safety-tip-bullet">&#8226;</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="safety-tips">
              <h4 className="safety-section-title">Scam Awareness</h4>
              <div className="safety-tips-list">
                {emergencyData.scam_awareness.map((tip, i) => (
                  <div key={i} className="safety-tip-item">
                    <span className="safety-tip-bullet">&#9888;</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

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

      {emailShareModal && (
        <div className="photo-modal-overlay" onClick={() => setEmailShareModal(false)}>
          <div className="photo-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="photo-modal-header">
              <h3>{'\u2709\uFE0F'} Share via Email</h3>
              <button className="photo-modal-close" onClick={() => setEmailShareModal(false)}>&times;</button>
            </div>
            <p className="form-hint" style={{ marginBottom: 12 }}>
              Send the trip itinerary link to an email address.
            </p>
            <input
              className="form-input"
              type="email"
              placeholder="Enter recipient email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              style={{ width: "100%", marginBottom: 12 }}
            />
            <button
              className="btn btn-primary btn-sm"
              style={{ width: "100%" }}
              disabled={emailShareLoading || !recipientEmail.includes("@")}
              onClick={async () => {
                setEmailShareLoading(true);
                try {
                  await trips.shareViaEmail(id, recipientEmail, user?.id);
                  addToast(`Trip shared to ${recipientEmail}!`, "success");
                  setEmailShareModal(false);
                  setRecipientEmail("");
                } catch {
                  addToast("Failed to send email", "error");
                } finally {
                  setEmailShareLoading(false);
                }
              }}
            >
              {emailShareLoading ? <span className="spinner spinner-sm" /> : "Send Email"}
            </button>
          </div>
        </div>
      )}

      {showGems && hiddenGems && (
        <div className="card">
          <div className="card-header">
            <h3>{'\u{1F48E}'} Hidden Gems — {hiddenGems.destination}</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setShowGems(false)}>Close</button>
          </div>
          <div className="hidden-gems-grid">
            {hiddenGems.gems.map((gem, i) => (
              <div key={i} className="hidden-gem-card">
                <div className="hidden-gem-type">{gem.type}</div>
                <h4 className="hidden-gem-name">{gem.name}</h4>
                <p className="hidden-gem-why">{gem.why}</p>
                <div className="hidden-gem-location">{'\u{1F4CD}'} {gem.location}</div>
              </div>
            ))}
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
            {hotels.map((h, i) => {
              const tierInfo = TIER_BADGES[h.tier] || TIER_BADGES.mid;
              return (
                <div key={i} className="hotel-card">
                  <div className="hotel-card-name">{h.name}</div>
                  <span className={`hotel-tier-badge ${tierInfo.class}`}>{tierInfo.label}</span>
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
              );
            })}
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
                  onCondition={(cond) => setDayWeather((prev) => ({ ...prev, [day.day]: cond }))}
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
                          {(() => {
                            const wt = getWeatherTip(day.day, act.category);
                            if (!wt) return null;
                            return (
                              <span className="activity-weather-tip" title={wt.tip}>
                                {wt.icon}
                              </span>
                            );
                          })()}
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

    </div>
  );
}

export default TripView;
