import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { trips } from "../api";
import { useToast } from "../components/Toast";

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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      <div className="page-header">
        <div>
          <h2>Plan a New Trip</h2>
          <p className="text-muted">Tell us about your dream destination</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Destination *</label>
            <input name="destination" value={form.destination} onChange={handleChange} placeholder="e.g., Paris, France" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <input type="date" name="end_date" value={form.end_date} onChange={handleChange} min={form.start_date || undefined} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Budget *</label>
              <input name="budget" value={form.budget} onChange={handleChange} placeholder="e.g., $1000" required />
            </div>
            <div className="form-group">
              <label>Travelers *</label>
              <input name="travelers" value={form.travelers} onChange={handleChange} placeholder="e.g., 2" type="number" min="1" required />
            </div>
          </div>

          <div className="form-group">
            <label>Interests *</label>
            <textarea name="interests" value={form.interests} onChange={handleChange} placeholder="e.g., food, history, adventure, nature, museums, shopping" rows={3} required />
            <p className="form-hint">Separate interests with commas</p>
          </div>

          {error && <p className="form-error">&#9888; {error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="spinner spinner-sm" />
                Generating with AI...
              </span>
            ) : (
              "Generate Itinerary"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PlanTrip;
