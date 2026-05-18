import { imageUrl } from "../api/client.js";
import {
  formatINR,
  formatDateIN,
  CATEGORY_COLORS,
  CATEGORIES,
} from "../utils/format.js";
import { getTotal, monthOptions } from "../utils/expenseStats.js";

export default function ExpenseList({
  expenses,
  filters,
  onFilterChange,
  onEdit,
  onDelete,
  busyId,
}) {
  const months = monthOptions(expenses);
  const total = getTotal(expenses);

  return (
    <section className="expense-panel glass">
      <div className="section-head">
        <div>
          <h2>All Expenses</h2>
          <p>Manage bills with filters and quick actions</p>
        </div>
        <div className="total-chip">
          Filtered total: <strong>{formatINR(total)}</strong>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-field">
          <label>Category</label>
          <select
            className="input"
            value={filters.category}
            onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label>Month</label>
          <select
            className="input"
            value={filters.month}
            onChange={(e) => onFilterChange({ ...filters, month: e.target.value })}
          >
            <option value="All">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label>Min ₹</label>
          <input
            className="input"
            type="number"
            min="0"
            placeholder="0"
            value={filters.minAmount}
            onChange={(e) => onFilterChange({ ...filters, minAmount: e.target.value })}
          />
        </div>
        <div className="filter-field">
          <label>Max ₹</label>
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Any"
            value={filters.maxAmount}
            onChange={(e) => onFilterChange({ ...filters, maxAmount: e.target.value })}
          />
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="empty-state">No expenses match your filters.</div>
      ) : (
        <div className="table-wrap">
          <table className="expense-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Merchant</th>
                <th>Category</th>
                <th>Date</th>
                <th>Confidence</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e._id} className="expense-row">
                  <td>
                    <img
                      className="table-thumb"
                      src={imageUrl(e.image)}
                      alt={e.merchant}
                    />
                  </td>
                  <td className="cell-merchant">{e.merchant}</td>
                  <td>
                    <span
                      className="cat-badge"
                      style={{
                        borderColor: `${CATEGORY_COLORS[e.category] || "#94a3b8"}55`,
                        color: CATEGORY_COLORS[e.category] || "#94a3b8",
                        background: `${CATEGORY_COLORS[e.category] || "#94a3b8"}18`,
                      }}
                    >
                      {e.category}
                    </span>
                  </td>
                  <td className="cell-muted">{formatDateIN(e.date)}</td>
                  <td>
                    <span className={`conf-badge conf-${confidenceLevel(e.confidence)}`}>
                      {e.confidence ?? 85}%
                    </span>
                  </td>
                  <td className="cell-amount">{formatINR(e.amount)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={busyId === e._id}
                        onClick={() => onEdit(e)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        disabled={busyId === e._id}
                        onClick={() => onDelete(e._id)}
                      >
                        {busyId === e._id ? "…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function confidenceLevel(score) {
  const s = Number(score) || 85;
  if (s >= 85) return "high";
  if (s >= 65) return "mid";
  return "low";
}
