import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { trips } from "../api";

function PlanTrip() {
  const [form, setForm] = useState({
    destination: "",
    start_date: "",
    end_date: "",
    budget: "",
    interests: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const trip = await trips.generate(form, user.id);
      navigate(`/trips/${trip.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Plan a New Trip</h2>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Destination *</label>
            <input name="destination" value={form.destination} onChange={handleChange} placeholder="e.g., Paris, France" required />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Start Date</label>
              <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>End Date</label>
              <input type="date" name="end_date" value={form.end_date} onChange={handleChange} min={form.start_date || undefined} required />
            </div>
          </div>
          <div className="form-group">
            <label>Budget</label>
            <input name="budget" value={form.budget} onChange={handleChange} placeholder="e.g., $1000" required />
          </div>
          <div className="form-group">
            <label>Interests</label>
            <textarea name="interests" value={form.interests} onChange={handleChange} placeholder="e.g., food, history, adventure, nature" rows={3} required />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Generating..." : "Generate Itinerary"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PlanTrip;
