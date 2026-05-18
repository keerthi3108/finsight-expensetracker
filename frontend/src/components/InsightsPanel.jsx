import { formatINR } from "../utils/format.js";

export default function InsightsPanel({ summary, loading, error, onRefreshAi }) {
  return (
    <aside className="insights-panel glass">
      <div className="section-head compact">
        <div>
          <h2>AI Insights</h2>
          <p>
            {summary?.aiGenerated
              ? "Powered by Gemini · live analysis"
              : "Computed insights · refresh for AI"}
          </p>
        </div>
        <div className="insights-actions">
          {loading && <span className="live-dot">Analyzing</span>}
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={loading}
            onClick={onRefreshAi}
          >
            Refresh AI
          </button>
        </div>
      </div>

      {error && <div className="inline-alert error">{error}</div>}

      {loading && !summary ? (
        <div className="insights-loading">
          <span className="spinner lg" />
          <p>Generating personalized finance insights…</p>
        </div>
      ) : null}

      {summary && (
        <div className="insights-stack">
          <div className="insight-card highlight">
            <h3>Total Spending</h3>
            <p className="insight-big">{formatINR(summary.totalSpending)}</p>
          </div>

          {summary.monthlyComparison && (
            <div className="insight-card">
              <h3>Monthly Comparison</h3>
              <p>{summary.monthlyComparison}</p>
              <div className="compare-row">
                <span>This month: {formatINR(summary.thisMonthSpend || 0)}</span>
                <span>Last month: {formatINR(summary.lastMonthSpend || 0)}</span>
              </div>
            </div>
          )}

          {(summary.spendingHabits || summary.spendingPattern) && (
            <div className="insight-card">
              <h3>Spending Habits</h3>
              <p>{summary.spendingHabits || summary.spendingPattern}</p>
            </div>
          )}

          {summary.overspendingAlerts?.length > 0 && (
            <div className="insight-card alert-card">
              <h3>Overspending Alerts</h3>
              <ul>
                {summary.overspendingAlerts.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {summary.categoryInsights &&
            Object.keys(summary.categoryInsights).length > 0 && (
              <div className="insight-card">
                <h3>Category Insights</h3>
                <div className="kv-list">
                  {Object.entries(summary.categoryInsights).map(([k, v]) => (
                    <div key={k} className="kv-item">
                      <span>{k}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {summary.savingTips?.length > 0 && (
            <div className="insight-card tips-card">
              <h3>Saving Suggestions</h3>
              <ul>
                {summary.savingTips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {summary.reminders?.length > 0 && (
            <div className="insight-card">
              <h3>Reminders</h3>
              <ul>
                {summary.reminders.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
