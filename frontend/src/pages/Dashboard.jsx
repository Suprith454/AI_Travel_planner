import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../AuthContext";
import { trips } from "../api";
import { useToast } from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";

const QUICK_DESTINATIONS = [
  { name: "Paris", desc: "City of Light & Love", emoji: "\u{1F30D}" },
  { name: "Tokyo", desc: "Tradition meets Future", emoji: "\u{1F5FC}" },
  { name: "Goa", desc: "Beaches & Nightlife", emoji: "\u{1F3D6}" },
  { name: "Manali", desc: "Mountain Adventure", emoji: "\u{1F3D4}" },
];

function Dashboard() {
  const [tripList, setTripList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [quickDest, setQuickDest] = useState("");
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

  const handleDuplicate = async (e, tripId) => {
    e.stopPropagation();
    try {
      const duped = await trips.duplicate(tripId);
      addToast("Trip duplicated!", "success");
      setTripList((prev) => [duped, ...prev]);
    } catch {
      addToast("Failed to duplicate trip", "error");
    }
  };

  const handleQuickPlan = () => {
    const dest = quickDest.trim();
    if (!dest) return;
    navigate("/chat");
    setTimeout(() => {
      document.querySelector(".chat-input")?.focus();
    }, 300);
  };

  const handleQuickKeyDown = (e) => {
    if (e.key === "Enter") handleQuickPlan();
  };

  const today = new Date();
  const upcoming = tripList.filter((t) => t.start_date && new Date(t.start_date) >= today);
  const totalBudget = tripList.reduce((sum, t) => {
    const num = t.budget ? parseFloat(t.budget.replace(/[^0-9.]/g, "")) : 0;
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
  const destinations = new Set(tripList.map((t) => t.destination?.toLowerCase())).size;

  if (loading) {
    return (
      <div className="main-content">
        <div className="skeleton skeleton-hero" />
        <div className="skeleton skeleton-text-lg" />
        <div className="skeleton skeleton-text-sm" />
        <div className="skeleton-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <motion.div
        className="dashboard-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="dashboard-hero-content">
          <h1 className="dashboard-hero-title">
            Where to next, <span className="text-primary">{user?.name?.split(" ")[0] || "Traveler"}</span>?
          </h1>
          <p className="dashboard-hero-subtitle">
            Plan your perfect trip with AI — just tell me where you want to go
          </p>
          <div className="dashboard-hero-search">
            <input
              className="dashboard-hero-input"
              type="text"
              placeholder="Enter a destination..."
              value={quickDest}
              onChange={(e) => setQuickDest(e.target.value)}
              onKeyDown={handleQuickKeyDown}
            />
            <button className="btn btn-primary" onClick={handleQuickPlan} disabled={!quickDest.trim()}>
              Plan Trip
            </button>
          </div>
          <div className="dashboard-hero-quick">
            {QUICK_DESTINATIONS.map((d) => (
              <button
                key={d.name}
                className="dashboard-quick-btn"
                onClick={() => { setQuickDest(d.name); }}
              >
                <span>{d.emoji}</span>
                <div>
                  <div className="dashboard-quick-name">{d.name}</div>
                  <div className="dashboard-quick-desc">{d.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {tripList.length > 0 && (
        <>
          <motion.div
            className="dashboard-stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="stat-card">
              <div className="stat-card-label">Total Trips</div>
              <div className="stat-card-value primary">{tripList.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Upcoming</div>
              <div className="stat-card-value info">{upcoming.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Budget Planned</div>
              <div className="stat-card-value warning">${totalBudget.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Destinations</div>
              <div className="stat-card-value">{destinations}</div>
            </div>
          </motion.div>

          <div className="page-header" style={{ marginTop: 8 }}>
            <div>
              <h2>My Trips</h2>
              <p className="text-muted">{tripList.length} trip{tripList.length !== 1 ? "s" : ""} planned</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate("/plan")}>
              + New Trip
            </button>
          </div>

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
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={(e) => handleDuplicate(e, trip.id)}
                    style={{ fontSize: 12 }}
                  >
                    Duplicate
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {tripList.length === 0 && (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="empty-state-icon" style={{ fontSize: 48, marginBottom: 16 }}>&#9992;</div>
          <h3>No trips yet</h3>
          <p>Start planning your adventure above!</p>
        </motion.div>
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