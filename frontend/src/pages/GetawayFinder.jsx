import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { tools } from "../api";
import { useToast } from "../components/Toast";

const KNOWN_CITIES = [
  { name: "Bangalore", icon: "\u{1F4CD}" },
  { name: "Mumbai", icon: "\u{1F3D6}\uFE0F" },
  { name: "Delhi", icon: "\u{1F5FD}" },
  { name: "Chennai", icon: "\u{1F306}" },
  { name: "Kolkata", icon: "\u{1F3F0}" },
  { name: "Hyderabad", icon: "\u{1F4B0}" },
];

const TYPE_ICONS = {
  "hill station": "\u{1F3D4}\uFE0F",
  "heritage": "\u{1F3DB}\uFE0F",
  "beach": "\u{1F3D6}\uFE0F",
  "adventure": "\u{1F3D4}\uFE0F",
  "city": "\u{1F3EC}",
  "religious": "\u{1F54A}\uFE0F",
  "wildlife": "\u{1F98C}",
};

function GetawayFinder() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [form, setForm] = useState({ location: "", days: "2", budget: "" });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSearch = async (loc) => {
    const location = loc || form.location;
    if (!location.trim()) {
      addToast("Enter your location", "error");
      return;
    }
    setForm({ ...form, location });
    setLoading(true);
    try {
      const data = await tools.getaways(location, form.budget ? parseFloat(form.budget) : null, parseInt(form.days));
      setResults(data);
    } catch (err) {
      addToast("Failed to find getaways: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const renderStars = (rating) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return "\u2605".repeat(full) + (half ? "\u00BD" : "") + "\u2606".repeat(5 - full - (half ? 1 : 0));
  };

  return (
    <div className="main-content">
      <button className="back-btn" onClick={() => navigate("/")}>&larr; Back</button>
      <div className="page-header">
        <div>
          <h2>{'\u{1F3D4}\uFE0F'} Weekend Getaway Finder</h2>
          <p className="text-muted">Discover nearby destinations perfect for a short trip</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your City / Location</label>
            <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Bangalore, Mumbai, Delhi" required />
            <div className="getaway-city-buttons">
              {KNOWN_CITIES.map((c) => (
                <button key={c.name} type="button" className="btn btn-outline btn-sm" onClick={() => handleSearch(c.name)}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Days</label>
              <input name="days" type="number" min="1" max="7" value={form.days} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Budget (optional, INR)</label>
              <input name="budget" type="number" min="0" value={form.budget} onChange={handleChange} placeholder="Leave blank for all" />
            </div>
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : "\u{1F50D}"} Find Getaways
          </button>
        </form>
      </div>

      {results && (
        <div className="getaway-results">
          <div className="page-header" style={{ marginTop: 20 }}>
            <h3>Suggestions from {results.location}</h3>
            <span className="text-muted">{results.suggestions.length} destination{results.suggestions.length !== 1 ? "s" : ""}</span>
          </div>
          {results.suggestions.length === 0 ? (
            <p className="text-muted">No getaways found for this location.</p>
          ) : (
            <div className="getaway-grid">
              {results.suggestions.map((s, i) => (
                <div key={i} className="getaway-card">
                  <div className="getaway-card-type">{TYPE_ICONS[s.type] || "\u{1F30D}"} {s.type}</div>
                  <h4 className="getaway-card-name">{s.name}</h4>
                  {s.state && <div className="getaway-card-state">{s.state}</div>}
                  <div className="getaway-card-meta">
                    <div className="getaway-card-meta-item">
                      <span className="getaway-meta-label">Distance</span>
                      <span className="getaway-meta-value">{s.distance_km} km</span>
                    </div>
                    <div className="getaway-card-meta-item">
                      <span className="getaway-meta-label">Travel Time</span>
                      <span className="getaway-meta-value">{s.travel_time}</span>
                    </div>
                    <div className="getaway-card-meta-item">
                      <span className="getaway-meta-label">Budget</span>
                      <span className="getaway-meta-value">{s.budget_estimate}</span>
                    </div>
                    <div className="getaway-card-meta-item">
                      <span className="getaway-meta-label">Best Time</span>
                      <span className="getaway-meta-value">{s.best_time}</span>
                    </div>
                  </div>
                  <div className="getaway-card-footer">
                    <span className="getaway-rating">{renderStars(s.rating)} {s.rating}</span>
                    <span className={`getaway-budget-badge ${s.within_budget ? "in-budget" : "over-budget"}`}>
                      {s.within_budget ? "\u2705 Within budget" : "\u26A0\uFE0F Over budget"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GetawayFinder;
