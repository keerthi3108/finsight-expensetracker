import { imageUrl } from "../api/client.js";
import { formatINR, formatDateIN, CATEGORY_COLORS } from "../utils/format.js";

export default function RecentTransactions({ expenses }) {
  const recent = [...expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  return (
    <section className="recent-section glass">
      <div className="section-head">
        <div>
          <h2>Recent Transactions</h2>
          <p>Latest bills processed by AI</p>
        </div>
        <span className="count-pill">{recent.length} shown</span>
      </div>

      {recent.length === 0 ? (
        <div className="empty-state">No transactions yet. Upload your first receipt.</div>
      ) : (
        <div className="recent-list">
          {recent.map((e) => (
            <div key={e._id} className="recent-row">
              <img
                className="recent-thumb"
                src={imageUrl(e.image)}
                alt={e.merchant}
              />
              <div className="recent-info">
                <p className="recent-merchant">{e.merchant}</p>
                <p className="recent-meta">
                  {formatDateIN(e.date)}
                  <span
                    className="cat-badge"
                    style={{
                      borderColor: `${CATEGORY_COLORS[e.category] || "#94a3b8"}55`,
                      color: CATEGORY_COLORS[e.category] || "#94a3b8",
                    }}
                  >
                    {e.category}
                  </span>
                </p>
              </div>
              <div className="recent-amount">{formatINR(e.amount)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
