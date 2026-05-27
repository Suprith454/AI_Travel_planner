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

  if (loading) return <p style={{ textAlign: "center", marginTop: 40 }}>Loading...</p>;
  if (!trip) return null;

  const days = trip.itinerary?.days || [];
  const allActivities = days.flatMap((d) => d.activities || []);

  return (
    <div>
      <button className="btn" onClick={() => navigate("/")} style={{ marginBottom: 16 }}>
        ← Back to My Trips
      </button>

      <div className="card">
        <h2>{trip.title}</h2>
        <p style={{ color: "#666", marginTop: 4 }}>
          {trip.destination}
          {trip.start_date ? ` | ${trip.start_date} to ${trip.end_date}` : ""}
          {trip.budget ? ` | Budget: ${trip.budget}` : ""}
        </p>
        {trip.interests && <p style={{ color: "#888", fontSize: 13, marginTop: 4 }}>Interests: {trip.interests}</p>}
      </div>

      {allActivities.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Map View</h3>
          <ItineraryMap activities={allActivities} />
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Itinerary</h3>
        {days.length === 0 ? (
          <p>No itinerary details available.</p>
        ) : (
          days.map((day) => (
            <div key={day.day} className="day-card">
              <h3>Day {day.day}{day.date ? ` - ${day.date}` : ""}</h3>
              {day.activities.map((act, i) => (
                <div key={i} className="activity">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div className="activity-name">{act.name}</div>
                      {act.description && <div className="activity-desc">{act.description}</div>}
                      {act.cost && <div className="activity-cost">Cost: {act.cost}</div>}
                    </div>
                    <button
                      className="btn"
                      onClick={() => openPhotos(act.name)}
                      style={{ fontSize: 12, padding: "4px 10px", marginLeft: 8, whiteSpace: "nowrap" }}
                    >
                      View Photos
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {photoModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20,
          }}
          onClick={() => setPhotoModal(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 12, maxWidth: 800, width: "100%",
              maxHeight: "90vh", overflow: "auto", padding: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{photoModal}</h3>
              <button className="btn" onClick={() => setPhotoModal(null)} style={{ fontSize: 18, padding: "4px 12px" }}>✕</button>
            </div>
            {photoLoading ? (
              <p style={{ textAlign: "center", color: "#888" }}>Loading photos...</p>
            ) : photoResults.length === 0 ? (
              <p style={{ textAlign: "center", color: "#888" }}>No photos found. Add an Unsplash API key to get real photos.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {photoResults.map((photo, i) => (
                  <a key={i} href={photo.urls?.regular} target="_blank" rel="noopener noreferrer">
                    <img
                      src={photo.urls?.small}
                      alt={photo.alt_description || photoModal}
                      style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 8 }}
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
