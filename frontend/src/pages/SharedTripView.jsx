import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import BudgetSummary from "../components/BudgetSummary";
import WeatherPanel from "../components/WeatherPanel";

function getCategoryClass(cat) {
  const map = {
    food: "food", sightseeing: "sightseeing", adventure: "adventure",
    culture: "culture", shopping: "shopping", relaxation: "relaxation", nightlife: "nightlife",
  };
  return map[cat] || "other";
}

function SharedTripView() {
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || "/api";
    fetch(`${API}/trips/shared/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Trip not found");
        return r.json();
      })
      .then(setTrip)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p className="loading-text">Loading shared trip...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="loading-page">
        <div className="empty-state-icon">&#128375;</div>
        <h3>Trip not found</h3>
        <p className="text-muted">This share link may be invalid or the trip was deleted.</p>
      </div>
    );
  }

  const days = trip.itinerary?.days || [];

  return (
    <div className="main-content">
      <div className="shared-banner">
        <span>&#128279; Shared trip view</span>
      </div>

      <div className="trip-header">
        <h2>{trip.title}</h2>
        <div className="trip-meta">
          <span className="trip-meta-badge location">&#128205; {trip.destination}</span>
          {trip.budget && <span className="trip-meta-badge budget">&#128176; {trip.budget}</span>}
        </div>
      </div>

      <BudgetSummary trip={trip} />

      <div className="card">
        <div className="card-header">
          <h3>Itinerary</h3>
          <span className="text-muted" style={{ fontSize: 13 }}>{days.length} day{days.length !== 1 ? "s" : ""}</span>
        </div>
        {days.length === 0 ? (
          <p className="text-muted">No itinerary details available.</p>
        ) : (
          days.map((day, di) => (
            <div key={day.day} className="day-card">
              <div className="day-card-header">
                <h3>
                  <span className="day-number">{day.day}</span>
                  Day {day.day}
                </h3>
                <WeatherPanel
                  lat={day.activities?.[0]?.lat}
                  lng={day.activities?.[0]?.lng}
                  dayLabel={`Day ${day.day}`}
                />
              </div>
              {day.date && <span className="day-date" style={{ display: "block", marginBottom: 12 }}>{day.date}</span>}

              {day.activities.map((act, i) => (
                <div key={i}>
                  <div className="activity">
                    <div className="activity-row">
                      {act.time && <div className="activity-time">{act.time}</div>}
                      <div className="activity-content">
                        <div className="activity-name">
                          {act.name}
                          {act.duration && <span className="activity-duration">&#9200; {act.duration}</span>}
                          {act.category && (
                            <span className={`activity-category ${getCategoryClass(act.category)}`}>
                              {act.category}
                            </span>
                          )}
                        </div>
                        {act.description && <div className="activity-desc">{act.description}</div>}
                        <div className="activity-footer">
                          {act.cost && <div className="activity-cost">&#128176; {act.cost}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                  {act.next_transit && (
                    <div className={`transit-indicator ${act.next_transit.mode}`}>
                      <span className="transit-line" />
                      <span className="transit-label">
                        {act.next_transit.mode === "walk" ? "\u{1F6B6}" : "\u{1F697}"} {act.next_transit.minutes} min {act.next_transit.mode}
                        {act.next_transit.distance_km != null && ` \u00B7 ${act.next_transit.distance_km} km`}
                      </span>
                      <span className="transit-line" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SharedTripView;
