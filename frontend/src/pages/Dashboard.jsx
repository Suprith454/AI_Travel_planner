import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { trips } from "../api";

function Dashboard() {
  const [tripList, setTripList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const data = await trips.list(user.id);
      setTripList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, tripId) => {
    e.stopPropagation();
    if (confirm("Delete this trip?")) {
      await trips.delete(tripId);
      loadTrips();
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p className="loading-text">Loading your trips...</p>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h2>My Trips</h2>
          <p className="text-muted">{tripList.length} trip{tripList.length !== 1 ? "s" : ""} planned</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/plan")}>
          + Plan New Trip
        </button>
      </div>

      {tripList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#9992;</div>
          <h3>No trips yet</h3>
          <p>Plan your first adventure!</p>
          <button className="btn btn-primary" onClick={() => navigate("/plan")}>
            Plan a Trip
          </button>
        </div>
      ) : (
        <div className="trip-grid">
          {tripList.map((trip) => (
            <div key={trip.id} className="trip-card" onClick={() => navigate(`/trips/${trip.id}`)}>
              <div className="trip-card-delete">
                <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(e, trip.id)}>
                  Delete
                </button>
              </div>
              <div className="trip-card-top">
                <div>
                  <div className="trip-card-destination">{trip.destination}</div>
                  {trip.start_date && (
                    <div className="trip-card-dates">
                      {trip.start_date} &rarr; {trip.end_date}
                    </div>
                  )}
                </div>
              </div>
              {trip.budget && (
                <div className="trip-card-budget">&#128176; {trip.budget}</div>
              )}
              {trip.interests && (
                <div className="trip-card-interests">
                  {trip.interests.split(",").map((interest, i) => (
                    <span key={i} className="trip-meta-badge interest">{interest.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
