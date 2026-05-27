import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trips } from "../api";
import ItineraryMap from "../components/ItineraryMap";

function TripView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

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
                  <div className="activity-name">{act.name}</div>
                  {act.description && <div className="activity-desc">{act.description}</div>}
                  {act.cost && <div className="activity-cost">Cost: {act.cost}</div>}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TripView;
