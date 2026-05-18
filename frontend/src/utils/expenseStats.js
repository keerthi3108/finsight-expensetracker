import { CATEGORY_COLORS, formatMonthYear } from "./format.js";

export function getTotal(expenses) {
  return expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
}

export function getThisMonthSpend(expenses) {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  return expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === m && d.getFullYear() === y;
    })
    .reduce((s, e) => s + Number(e.amount || 0), 0);
}

export function getHighestCategory(expenses) {
  if (!expenses.length) return { name: "—", total: 0 };
  const map = {};
  for (const e of expenses) {
    map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
  }
  let best = "—";
  let total = 0;
  for (const [cat, amt] of Object.entries(map)) {
    if (amt > total) {
      best = cat;
      total = amt;
    }
  }
  return { name: best, total };
}

/** Pie chart: category-wise totals. */
export function categoryPieData(expenses) {
  const map = {};
  for (const e of expenses) {
    map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
  }
  return Object.entries(map).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
    fill: CATEGORY_COLORS[name] || CATEGORY_COLORS.Other,
  }));
}

/** Bar chart: last 6 months totals. */
export function monthlyBarData(expenses) {
  const buckets = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets[key] = { month: formatMonthYear(d), total: 0, sortKey: d.getTime() };
  }
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (buckets[key]) {
      buckets[key].total += Number(e.amount || 0);
    }
  }
  return Object.values(buckets)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ month, total }) => ({
      month,
      total: Math.round(total * 100) / 100,
    }));
}

/** Line chart: cumulative spend over time (last 30 entries by date). */
export function spendingTrendData(expenses) {
  const sorted = [...expenses].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  let running = 0;
  return sorted.map((e) => {
    running += Number(e.amount || 0);
    const d = new Date(e.date);
    return {
      date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      amount: Number(e.amount || 0),
      cumulative: Math.round(running * 100) / 100,
    };
  });
}

/** Filter expenses by category, month (YYYY-MM), amount range. */
export function filterExpenses(expenses, { category, month, minAmount, maxAmount }) {
  return expenses.filter((e) => {
    if (category && category !== "All" && e.category !== category) return false;
    if (month && month !== "All") {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key !== month) return false;
    }
    const amt = Number(e.amount || 0);
    if (minAmount !== "" && minAmount != null && amt < Number(minAmount)) return false;
    if (maxAmount !== "" && maxAmount != null && amt > Number(maxAmount)) return false;
    return true;
  });
}

/** Unique YYYY-MM values for month filter dropdown. */
export function monthOptions(expenses) {
  const set = new Set();
  for (const e of expenses) {
    const d = new Date(e.date);
    set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return [...set].sort().reverse();
}
