import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../AuthContext";
import { trips } from "../api";
import { useToast } from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";

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
      <div className="main-content">
        <div className="skeleton skeleton-text-lg" style={{ marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" />
        <div className="skeleton-grid" style={{ marginTop: 24 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
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
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline" onClick={() => navigate("/chat")}>AI Chat</button>
          <button className="btn btn-primary" onClick={() => navigate("/plan")}>+ New Trip</button>
        </div>
      </div>

      {tripList.length === 0 ? (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="empty-state-icon">&#9992;</div>
          <h3>No trips yet</h3>
          <p>Plan your first adventure to get started.</p>
          <div className="flex" style={{ gap: 10, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={() => navigate("/plan")}>Plan a Trip</button>
            <button className="btn btn-outline" onClick={() => navigate("/chat")}>AI Chat</button>
          </div>
        </motion.div>
      ) : (
        <div className="trip-grid">
          {tripList.map((trip, i) => (
            <motion.div
              key={trip.id}
              className="trip-card"
              onClick={() => navigate(`/trips/${trip.id}`)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="trip-card-delete">
                <button className="btn btn-danger btn-sm" onClick={(e) => handleDeleteClick(e, trip.id)}>Delete</button>
              </div>
              <div className="trip-card-top">
                <div>
                  <div className="trip-card-destination">{trip.destination}</div>
                  {trip.start_date && (
                    <div className="trip-card-dates">{trip.start_date} &rarr; {trip.end_date}</div>
                  )}
                </div>
              </div>
              {trip.budget && <div className="trip-card-budget">&#128176; {trip.budget}</div>}
              {trip.interests && (
                <div className="trip-card-interests">
                  {trip.interests.split(",").map((interest, i) => (
                    <span key={i} className="trip-meta-badge interest">{interest.trim()}</span>
                  ))}
                </div>
              )}
            </motion.div>
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
  );
}

export default Dashboard;