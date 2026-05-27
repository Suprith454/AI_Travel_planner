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

  if (loading) return <p style={{ textAlign: "center", marginTop: 40 }}>Loading...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2>My Trips</h2>
        <button className="btn btn-primary" onClick={() => navigate("/plan")}>
          Plan New Trip
        </button>
      </div>
      {tripList.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          <p>No trips yet. Plan your first trip!</p>
        </div>
      ) : (
        tripList.map((trip) => (
          <div key={trip.id} className="trip-card" onClick={() => navigate(`/trips/${trip.id}`)}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <h3>{trip.title}</h3>
                <p>{trip.destination}{trip.start_date ? ` | ${trip.start_date} to ${trip.end_date}` : ""}</p>
                {trip.budget && <p>Budget: {trip.budget}</p>}
              </div>
              <button className="btn btn-danger" onClick={(e) => handleDelete(e, trip.id)} style={{ fontSize: 12, padding: "4px 10px" }}>
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Dashboard;
