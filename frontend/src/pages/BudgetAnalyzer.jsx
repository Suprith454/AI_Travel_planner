import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { tools } from "../api";
import { useToast } from "../components/Toast";

const TIERS = [
  { value: "budget", label: "Budget", icon: "\u{1F4B0}", desc: "$50-100/day" },
  { value: "mid", label: "Mid", icon: "\u{1F4B5}", desc: "$150-250/day" },
  { value: "luxury", label: "Luxury", icon: "\u{1F48E}", desc: "$350-500/day" },
];

function BudgetAnalyzer() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [form, setForm] = useState({ destination: "", days: "", travelers: "1", budget: "", tier: "mid" });
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [multiTier, setMultiTier] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.destination.trim() || !form.days) {
      addToast("Destination and days required", "error");
      return;
    }
    setLoading(true);
    try {
      const [a, m] = await Promise.all([
        tools.budgetAnalyze(form.destination, parseInt(form.days), parseInt(form.travelers), form.budget ? parseFloat(form.budget) : null, form.tier),
        tools.multiTier(form.destination, parseInt(form.days), parseInt(form.travelers)),
      ]);
      setAnalysis(a);
      setMultiTier(m);
    } catch (err) {
      addToast("Failed to analyze budget: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const gaugeDegree = analysis?.feasibility_score != null ? (analysis.feasibility_score / 100) * 180 : 0;
  const gaugeColor = analysis?.feasibility_score >= 80 ? "var(--primary)" : analysis?.feasibility_score >= 50 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="main-content">
      <button className="back-btn" onClick={() => navigate("/")}>&larr; Back</button>
      <div className="page-header">
        <div>
          <h2>{'\u{1F4CA}'} Budget Feasibility Analyzer</h2>
          <p className="text-muted">Check if your trip budget works — with category breakdowns and tier comparisons</p>
        </div>
      </div>

      <div className="budget-analyzer-layout">
        <div className="card budget-analyzer-form">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Destination</label>
              <input name="destination" value={form.destination} onChange={handleChange} placeholder="e.g. Paris, Tokyo, Goa" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Days</label>
                <input name="days" type="number" min="1" value={form.days} onChange={handleChange} placeholder="5" required />
              </div>
              <div className="form-group">
                <label>Travelers</label>
                <input name="travelers" type="number" min="1" value={form.travelers} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label>Budget (optional)</label>
              <input name="budget" type="number" min="0" value={form.budget} onChange={handleChange} placeholder="Leave blank for estimate only" />
              <p className="form-hint">Total trip budget (in destination currency)</p>
            </div>
            <div className="form-group">
              <label>Tier</label>
              <div className="tier-selector">
                {TIERS.map((t) => (
                  <button key={t.value} type="button" className={`tier-option ${form.tier === t.value ? "active" : ""}`} onClick={() => setForm({ ...form, tier: t.value })}>
                    <span className="tier-option-icon">{t.icon}</span>
                    <span className="tier-option-label">{t.label}</span>
                    <span className="tier-option-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? <span className="spinner spinner-sm" /> : "\u{1F50D}"} Analyze Budget
            </button>
          </form>
        </div>

        {analysis && (
          <div className="budget-analyzer-results">
            <div className="card budget-feasibility-card">
              <h3>Feasibility Score</h3>
              {analysis.feasibility_score != null ? (
                <div className="feasibility-gauge-wrap">
                  <div className="feasibility-gauge">
                    <div className="feasibility-gauge-bg" />
                    <div className="feasibility-gauge-fill" style={{ transform: `rotate(${gaugeDegree}deg)`, background: gaugeColor }} />
                    <div className="feasibility-gauge-center">
                      <span className="feasibility-score" style={{ color: gaugeColor }}>{analysis.feasibility_score}%</span>
                      <span className="feasibility-label">Feasible</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted" style={{ textAlign: "center", padding: 20 }}>Set a budget to see feasibility</p>
              )}
              <div className="feasibility-totals">
                <div className="feasibility-total-item">
                  <span className="feasibility-total-label">Per Person / Day</span>
                  <span className="feasibility-total-value">{analysis.currency}{analysis.per_person_daily}</span>
                </div>
                <div className="feasibility-total-item">
                  <span className="feasibility-total-label">Total Per Person</span>
                  <span className="feasibility-total-value">{analysis.currency}{analysis.total_per_person}</span>
                </div>
                <div className="feasibility-total-item">
                  <span className="feasibility-total-label">Total Trip Cost</span>
                  <span className="feasibility-total-value" style={{ color: analysis.over_budget ? "var(--danger)" : "var(--primary)" }}>
                    {analysis.currency}{analysis.total_trip_cost}
                  </span>
                </div>
              </div>
              {analysis.recommendation && (
                <div className={`feasibility-recommendation ${analysis.over_budget ? "over-budget" : "on-budget"}`}>
                  {analysis.over_budget ? "\u26A0\uFE0F" : "\u2705"} {analysis.recommendation}
                </div>
              )}
            </div>

            <div className="card">
              <h3>Category Breakdown ({form.tier} tier)</h3>
              <div className="analyzer-breakdown">
                {Object.entries(analysis.breakdown).map(([cat, data]) => {
                  const pct = analysis.total_trip_cost > 0 ? Math.round((data.total / analysis.total_trip_cost) * 100) : 0;
                  return (
                    <div key={cat} className="analyzer-breakdown-row">
                      <div className="analyzer-breakdown-header">
                        <span className="analyzer-breakdown-name" style={{ textTransform: "capitalize" }}>{cat}</span>
                          <span className="analyzer-breakdown-cost">{analysis.currency}{data.daily}/day &middot; {analysis.currency}{data.total} total</span>
                      </div>
                      <div className="budget-bar-track" style={{ height: 8 }}>
                        <div className="budget-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="analyzer-breakdown-pct">{pct}% of total</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {multiTier && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Multi-Tier Comparison</h3>
          <div className="multi-tier-grid">
            {Object.entries(multiTier.tiers).map(([tier, data]) => (
              <div key={tier} className={`multi-tier-card ${tier}`}>
                <div className="multi-tier-header">
                  <span className="multi-tier-icon">{TIERS.find((t) => t.value === tier)?.icon}</span>
                  <span className="multi-tier-label" style={{ textTransform: "capitalize" }}>{tier}</span>
                </div>
                <div className="multi-tier-total">{multiTier.currency}{data.total_cost}</div>
                <div className="multi-tier-daily">{multiTier.currency}{data.daily_per_person}/day per person</div>
                <div className="multi-tier-breakdown">
                  {Object.entries(data.breakdown).map(([cat, cost]) => (
                    <div key={cat} className="multi-tier-item">
                      <span style={{ textTransform: "capitalize" }}>{cat}</span>
                      <span>{multiTier.currency}{cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetAnalyzer;
