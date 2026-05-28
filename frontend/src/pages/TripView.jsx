import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trips, photos } from "../api";
import ItineraryMap from "../components/ItineraryMap";

function TripView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoModal, setPhotoModal] = useState(null);
  const [photoResults, setPhotoResults] = useState([]);
  const [photoLoading, setPhotoLoading] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [id]);

  const loadTrip = async () => {
    try {
      const data = await trips.get(id);
      setTrip(data);
    } catch (err) {
      console.error(err);
      navigate("/");
    } finally {
      setLoading(false);
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
      <div className="loading-page">
        <div className="spinner" />
        <p className="loading-text">Loading your trip...</p>
      </div>
    );
  }
  if (!trip) return null;

  const days = trip.itinerary?.days || [];
  const allActivities = days.flatMap((d) => (d.activities || []).map((a) => ({ ...a, day: d.day })));

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

      <div className="trip-content">
        <div className="trip-itinerary-section">
          <div className="card">
            <div className="card-header">
              <h3>Itinerary</h3>
              <span className="text-muted" style={{ fontSize: 13 }}>{days.length} day{days.length !== 1 ? "s" : ""}</span>
            </div>
            {days.length === 0 ? (
              <p className="text-muted">No itinerary details available.</p>
            ) : (
              days.map((day) => (
                <div key={day.day} className="day-card">
                  <div className="day-card-header">
                    <h3>
                      <span className="day-number">{day.day}</span>
                      Day {day.day}
                    </h3>
                    {day.date && <span className="day-date">{day.date}</span>}
                  </div>
                  {day.activities.map((act, i) => (
                    <div key={i} className="activity">
                      <div className="activity-row">
                        {act.time && <div className="activity-time">{act.time}</div>}
                        <div className="activity-content">
                          <div className="activity-name">
                            {act.name}
                            {act.category && (
                              <span className={`activity-category ${getCategoryClass(act.category)}`}>
                                {act.category}
                              </span>
                            )}
                          </div>
                          {act.description && <div className="activity-desc">{act.description}</div>}
                          <div className="activity-footer">
                            {act.cost && <div className="activity-cost">&#128176; {act.cost}</div>}
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => openPhotos(act.name)}
                            >
                              View Photos
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="trip-map-section">
          <div className="card">
            <h3>&#128506; Map View</h3>
            <ItineraryMap activities={allActivities} />
          </div>
        </div>
      </div>

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
              <p className="photo-empty">No photos found. Add an Unsplash API key to get real photos.</p>
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
    </div>
  );
}

export default TripView;
