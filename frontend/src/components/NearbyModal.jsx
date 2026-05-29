import { useState } from "react";
import { nearby } from "../api";

function getCategoryClass(cat) {
  const map = {
    food: "food", sightseeing: "sightseeing", adventure: "adventure",
    culture: "culture", shopping: "shopping", relaxation: "relaxation",
    nightlife: "nightlife", hotel: "culture",
  };
  return map[cat] || "other";
}

function NearbyModal({ activity, dayIndex, onClose, onSwap }) {
  const [livePlaces, setLivePlaces] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [searchCategory, setSearchCategory] = useState("");
  const [liveError, setLiveError] = useState("");

  const aiAlternatives = activity.nearby_alternatives || [];

  const searchLive = async () => {
    if (activity.lat == null || activity.lng == null) return;
    setLiveLoading(true);
    setLiveError("");
    try {
      const res = await nearby.search(activity.lat, activity.lng, 500, searchCategory);
      setLivePlaces(res.places || []);
    } catch {
      setLiveError("Could not fetch live places. Try again.");
    } finally {
      setLiveLoading(false);
    }
  };

  return (
    <div className="photo-modal-overlay" onClick={onClose}>
      <div className="photo-modal nearby-modal" onClick={(e) => e.stopPropagation()}>
        <div className="photo-modal-header">
          <h3>&#127758; Nearby Alternatives for "{activity.name}"</h3>
          <button className="photo-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="nearby-live-search">
          <div className="nearby-live-row">
            <select
              className="nearby-category-select"
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
            >
              <option value="">All categories</option>
              <option value="food">Food</option>
              <option value="sightseeing">Sightseeing</option>
              <option value="adventure">Adventure</option>
              <option value="culture">Culture</option>
              <option value="shopping">Shopping</option>
              <option value="relaxation">Relaxation</option>
              <option value="nightlife">Nightlife</option>
              <option value="hotel">Hotel</option>
            </select>
            <button
              className="btn btn-secondary btn-sm"
              onClick={searchLive}
              disabled={liveLoading || activity.lat == null}
            >
              {liveLoading ? <span className="spinner spinner-sm" /> : "&#128270;"}
              Search Live
            </button>
          </div>
          {liveError && <p className="form-error">{liveError}</p>}
        </div>

        <div className="nearby-grid">
          {aiAlternatives.map((alt, ai) => (
            <div key={`ai-${ai}`} className="alternative-card">
              <div className="alternative-card-header">
                <span className="nearby-badge-ai">AI</span>
                <strong>{alt.name}</strong>
                {alt.category && <span className={`activity-category ${getCategoryClass(alt.category)}`}>{alt.category}</span>}
              </div>
              <p className="alternative-desc">{alt.description}</p>
              <div className="alternative-meta">
                <span>&#9200; {alt.duration}</span>
                {alt.cost && <span>&#128176; {alt.cost}</span>}
              </div>
              {alt.reason && <p className="alternative-reason">&#128161; {alt.reason}</p>}
              <button
                className="btn btn-primary btn-sm"
                style={{ width: "100%", marginTop: 8 }}
                onClick={async () => {
                  await onSwap(dayIndex, {
                    action: "swap",
                    activity_index: activity.activityIndex,
                    alternative_index: ai,
                  });
                  onClose();
                }}
              >
                Use This Instead
              </button>
            </div>
          ))}

          {livePlaces.length > 0 && (
            <>
              <div className="nearby-divider">
                <span>&#128308; Live from OpenStreetMap</span>
              </div>
              {livePlaces.map((place, i) => (
                <div key={`live-${i}`} className="alternative-card">
                  <div className="alternative-card-header">
                    <span className="nearby-badge-live">LIVE</span>
                    <strong>{place.name}</strong>
                    {place.category && <span className={`activity-category ${getCategoryClass(place.category)}`}>{place.category}</span>}
                  </div>
                  {place.description && <p className="alternative-desc">{place.description}</p>}
                  <div className="alternative-meta">
                    <span>&#128205; {place.distance_m}m away</span>
                    {place.address && <span>{place.address}</span>}
                  </div>
                </div>
              ))}
            </>
          )}

          {aiAlternatives.length === 0 && livePlaces.length === 0 && !liveLoading && (
            <p className="form-hint" style={{ textAlign: "center", padding: 20 }}>
              No alternatives found. Try searching live above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default NearbyModal;
