import { formatINR, formatINRShort } from "../utils/format.js";

const icons = {
  total: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  month: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  category: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  bills: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

export default function SummaryCards({ total, monthSpend, highestCategory, billCount }) {
  const cards = [
    {
      key: "total",
      label: "Total Expenses",
      value: formatINR(total),
      sub: "All-time spending",
      icon: icons.total,
      accent: "card-accent-emerald",
    },
    {
      key: "month",
      label: "This Month",
      value: formatINRShort(monthSpend),
      sub: "Current month spend",
      icon: icons.month,
      accent: "card-accent-cyan",
    },
    {
      key: "cat",
      label: "Highest Category",
      value: highestCategory.name,
      sub: highestCategory.total ? formatINR(highestCategory.total) : "No data yet",
      icon: icons.category,
      accent: "card-accent-violet",
    },
    {
      key: "bills",
      label: "Bills Uploaded",
      value: String(billCount),
      sub: "Receipts processed",
      icon: icons.bills,
      accent: "card-accent-amber",
    },
  ];

  return (
    <div className="summary-grid">
      {cards.map((c) => (
        <article key={c.key} className={`summary-card glass ${c.accent}`}>
          <div className="summary-icon">{c.icon}</div>
          <div className="summary-body">
            <p className="summary-label">{c.label}</p>
            <p className="summary-value">{c.value}</p>
            <p className="summary-sub">{c.sub}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
