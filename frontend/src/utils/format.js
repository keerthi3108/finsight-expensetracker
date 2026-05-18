/** Indian Rupee formatting (en-IN locale). */
export function formatINR(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Compact INR for cards (e.g. ₹1,23,456). */
export function formatINRShort(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₹0";
  if (n >= 10000000) {
    return `₹${(n / 10000000).toFixed(2)} Cr`;
  }
  if (n >= 100000) {
    return `₹${(n / 100000).toFixed(2)} L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDateIN(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatMonthYear(date) {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export const CATEGORY_COLORS = {
  Food: "#f59e0b",
  Travel: "#3b82f6",
  Shopping: "#a855f7",
  Medical: "#ef4444",
  Bills: "#6366f1",
  Recharge: "#06b6d4",
  Entertainment: "#ec4899",
  Other: "#94a3b8",
};

export const CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Medical",
  "Bills",
  "Recharge",
  "Entertainment",
  "Other",
];
