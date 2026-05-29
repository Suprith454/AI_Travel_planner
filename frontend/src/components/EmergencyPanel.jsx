import { useState } from "react";
import { tools } from "../api";
import { useToast } from "./Toast";

const COUNTRY_OPTIONS = [
  "India", "USA", "UK", "France", "Japan", "Thailand", "UAE", "Australia", "Singapore",
];

function EmergencyPanel() {
  const { addToast } = useToast();
  const [country, setCountry] = useState("India");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const handleSearch = async (c) => {
    const countryName = c || country;
    setLoading(true);
    try {
      const result = await tools.emergency(countryName);
      setData(result);
    } catch (err) {
      addToast("Failed to load emergency info: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="emergency-panel">
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>{'\u{1F6A8}'} Emergency & Safety Center</h3>
        <div className="form-group">
          <label>Country</label>
          <div className="emergency-country-select">
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="emergency-select">
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => handleSearch()} disabled={loading}>
              {loading ? <span className="spinner spinner-sm" /> : "\u{1F50D}"} Get Info
            </button>
          </div>
        </div>
        <div className="emergency-quick-buttons">
          {COUNTRY_OPTIONS.slice(0, 5).map((c) => (
            <button key={c} className="btn btn-outline btn-sm" onClick={() => { setCountry(c); handleSearch(c); }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <>
          <div className="card emergency-numbers-card">
            <h3>{'\u{1F3E6}'} Emergency Numbers — {data.country}</h3>
            <div className="emergency-numbers-grid">
              {Object.entries(data.emergency_numbers).map(([service, number]) => (
                <div key={service} className="emergency-number-item">
                  <span className="emergency-service" style={{ textTransform: "capitalize" }}>{service.replace(/_/g, " ")}</span>
                  <span className="emergency-number">{number}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>{'\u{1F6E1}\uFE0F'} Safety Tips</h3>
            <div className="emergency-tips-list">
              {data.safety_tips.map((tip, i) => (
                <div key={i} className="emergency-tip-item">
                  <span className="emergency-tip-bullet">{"\u2022"}</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>{'\u{1F4AF}'} Scam Awareness</h3>
            <div className="emergency-tips-list">
              {data.scam_awareness.map((tip, i) => (
                <div key={i} className="emergency-tip-item">
                  <span className="emergency-tip-bullet" style={{ color: "var(--warning)" }}>{"\u26A0"}</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {data.embassy_info?.note && (
            <div className="card">
              <h3>{'\u{1F1E6}\u{1F1FA}'} Embassy Info</h3>
              <p className="text-muted">{data.embassy_info.note}</p>
              <p className="text-muted" style={{ marginTop: 8 }}>{data.embassy_info.tip}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EmergencyPanel;
