import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { trips } from "../api";
import { useToast } from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import BackgroundSlideshow from "../components/BackgroundSlideshow";

function Dashboard() {
  const [tripList, setTripList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const data = await trips.list(user.id);
      setTripList(data);
    } catch (err) {
      addToast("Failed to load trips", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await trips.delete(deleteTarget);
      addToast("Trip deleted successfully", "success");
      setDeleteTarget(null);
      loadTrips();
    } catch {
      addToast("Failed to delete trip", "error");
    }
  };

  const handleDeleteClick = (e, tripId) => {
    e.stopPropagation();
    setDeleteTarget(tripId);
  };

  if (loading) {
    return (
      <BackgroundSlideshow className="bg-slideshow-content-top">
        <div className="main-content">
          <div className="page-header">
            <div>
              <div className="skeleton skeleton-text-lg" />
              <div className="skeleton skeleton-text-sm" />
            </div>
            <div className="skeleton skeleton-badge" />
          </div>
          <div className="skeleton-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-card" />
            ))}
          </div>
        </div>
      </BackgroundSlideshow>
    );
  }

  return (
    <BackgroundSlideshow className="bg-slideshow-content-top">
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
                <button className="btn btn-danger btn-sm" onClick={(e) => handleDeleteClick(e, trip.id)}>
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

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Trip"
        message="Are you sure you want to delete this trip? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
    </BackgroundSlideshow>
  );
}

export default Dashboard;
