function BudgetSummary({ trip }) {
  const summary = trip?.budget_summary;
  if (!summary || summary.daily_costs.length === 0) return null;

  const totalCost = summary.total_cost;
  const currency = summary.currency;
  const budgetStr = trip.budget;

  const parsedBudget = budgetStr ? parseFloat(budgetStr.replace(/[^0-9.]/g, "")) : null;
  const hasBudget = parsedBudget && !isNaN(parsedBudget) && parsedBudget > 0;
  const overBudget = hasBudget && totalCost > parsedBudget;
  const ratio = hasBudget ? Math.min(totalCost / parsedBudget, 2) : 0;
  const pct = hasBudget ? Math.round(ratio * 100) : 0;
  const remaining = hasBudget ? Math.max(0, parsedBudget - totalCost) : null;

  return (
    <div className={`card budget-summary ${overBudget ? "budget-over" : ""}`}>
      <div className="budget-summary-header">
        <h3>&#128176; Budget Summary</h3>
        {budgetStr && <span className="budget-label">Target: {budgetStr}</span>}
      </div>

      <div className="budget-total-row">
        <span className="budget-total-label">Total Estimated Cost</span>
        <span className={`budget-total-value ${overBudget ? "text-danger" : ""}`}>
          {currency}{totalCost.toFixed(2)}
        </span>
      </div>

      {hasBudget && (
        <>
          <div className="budget-bar-track">
            <div
              className={`budget-bar-fill ${overBudget ? "budget-bar-over" : ratio > 0.8 ? "budget-bar-warn" : ""}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="budget-bar-labels">
            <span>{pct}% used</span>
            {remaining !== null && (
              <span className={overBudget ? "text-danger" : "text-success"}>
                {overBudget ? `Over by ${currency}${(totalCost - parsedBudget).toFixed(2)}` : `${currency}${remaining.toFixed(2)} remaining`}
              </span>
            )}
          </div>
        </>
      )}

      <div className="budget-days">
        {summary.daily_costs.map((d) => (
          <div key={d.day} className="budget-day-row">
            <span className="budget-day-label">
              Day {d.day}{d.date ? ` — ${d.date}` : ""}
            </span>
            <span className="budget-day-value">
              {currency}{d.cost.toFixed(2)}
              <span className="budget-day-count">{d.activities_count} activities</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BudgetSummary;
