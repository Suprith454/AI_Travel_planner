import { useState } from "react";

const TIERS = [
  { name: "Budget", icon: "\u{1F4B0}", range: "$50-100/day", desc: "Affordable stays, street food, free attractions, local transport" },
  { name: "Mid", icon: "\u{1F3E0}", range: "$150-250/day", desc: "Comfortable hotels, mix of restaurants, paid attractions" },
  { name: "Luxury", icon: "\u{1F451}", range: "$350-500/day", desc: "Premium hotels, fine dining, exclusive experiences" },
];

function TripPreview({ trip, onView }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const days = trip.itinerary?.days || [];
  const noBudget = !trip.budget || trip.budget === "Not specified";

  return (
    <div className="trip-preview">
      <div className="trip-preview-header">
        <div className="trip-preview-title">
          <span className="trip-preview-icon">&#9992;</span>
          <div>
            <strong>{trip.title}</strong>
            <div className="trip-preview-meta">
              {trip.destination && <span>&#128205; {trip.destination}</span>}
              {trip.budget && trip.budget !== "Not specified" && <span>&#128176; {trip.budget}</span>}
              <span>&#128197; {days.length} day{days.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      </div>

      {noBudget && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, textAlign: "center" }}>
            Choose your budget tier:
          </p>
          <div className="tier-card-grid">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`tier-card ${selectedTier === t.name ? "selected" : ""}`}
                onClick={() => setSelectedTier(t.name)}
              >
                <div className="tier-card-icon">{t.icon}</div>
                <div className="tier-card-name">{t.name}</div>
                <div className="tier-card-range">{t.range}</div>
                <div className="tier-card-desc">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`trip-preview-days ${expanded ? "expanded" : ""}`}>
        {days.slice(0, expanded ? days.length : 2).map((day) => (
          <div key={day.day} className="trip-preview-day">
            <div className="trip-preview-day-num">Day {day.day}</div>
            <div className="trip-preview-activities">
              {day.activities.slice(0, 4).map((act, i) => (
                <span key={i} className="trip-preview-activity">
                  {act.time && <span className="trip-preview-time">{act.time}</span>}
                  {act.name}
                  {i < Math.min(day.activities.length, 4) - 1 && " → "}
                </span>
              ))}
              {day.activities.length > 4 && (
                <span className="trip-preview-more">+{day.activities.length - 4} more</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {days.length > 2 && (
        <button className="trip-preview-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less ▲" : `Show all ${days.length} days ▼`}
        </button>
      )}

        {trip.budget_summary && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--surface-secondary)", borderRadius: "var(--radius-sm)", marginTop: 10 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Total Estimated Cost</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
              {trip.budget_summary.currency}{trip.budget_summary.total_cost.toFixed(2)}
            </span>
          </div>
        )}

        <button className="btn btn-primary btn-sm" style={{ width: "100%", marginTop: 10 }} onClick={onView}>
        View Full Itinerary →
      </button>
    </div>
  );
}

export default TripPreview;
