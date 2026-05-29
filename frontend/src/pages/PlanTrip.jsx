import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../AuthContext";
import { trips } from "../api";
import { useToast } from "../components/Toast";

const QUICK_DESTINATIONS = [
  { name: "Paris", desc: "City of Light & Love", emoji: "\u{1F30D}" },
  { name: "Tokyo", desc: "Tradition meets Future", emoji: "\u{1F5FC}" },
  { name: "Goa", desc: "Beaches & Nightlife", emoji: "\u{1F3D6}" },
  { name: "Manali", desc: "Mountain Adventure", emoji: "\u{1F3D4}" },
];

function PlanTrip() {
  const [form, setForm] = useState({
    destination: "",
    start_date: "",
    end_date: "",
    budget: "",
    travelers: "",
    interests: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleQuickSelect = (name) => {
    setForm({ ...form, destination: name });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.destination.trim()) return;
    setLoading(true);
    setError("");
    try {
      const trip = await trips.generate(form, user.id);
      addToast("Trip generated successfully!", "success");
      navigate(`/trips/${trip.id}`);
    } catch (err) {
      setError(err.message);
      addToast(err.message || "Failed to generate trip", "error");
    } finally {
      setLoading(false);
    }
  };

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
            Tell us your destination and we'll craft the perfect itinerary
          </p>
          <div className="dashboard-hero-quick">
            {QUICK_DESTINATIONS.map((d) => (
              <button
                key={d.name}
                className={`dashboard-quick-btn ${form.destination === d.name ? "selected" : ""}`}
                onClick={() => handleQuickSelect(d.name)}
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

      <div className="card">
        <div className="card-header">
          <h3>Trip Details</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Destination *</label>
            <input name="destination" value={form.destination} onChange={handleChange} placeholder="e.g., Paris, France" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" name="start_date" value={form.start_date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" name="end_date" value={form.end_date} onChange={handleChange} min={form.start_date || undefined} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Budget</label>
              <input name="budget" value={form.budget} onChange={handleChange} placeholder="e.g., $1000 or Budget/Mid/Luxury" />
            </div>
            <div className="form-group">
              <label>Travelers</label>
              <input name="travelers" value={form.travelers} onChange={handleChange} placeholder="e.g., 2" type="number" min="1" />
            </div>
          </div>

          <div className="form-group">
            <label>Interests</label>
            <textarea name="interests" value={form.interests} onChange={handleChange} placeholder="e.g., food, history, adventure, nature, museums, shopping" rows={2} />
            <p className="form-hint">Optional — separate with commas. Our AI will suggest activities either way.</p>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading || !form.destination.trim()} style={{ width: "100%", marginTop: 8 }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="spinner spinner-sm" />
                Generating with AI...
              </span>
            ) : "Generate Itinerary"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PlanTrip;