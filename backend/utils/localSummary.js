/**
 * Build dashboard insights from expense data without calling Gemini.
 * Used when API quota is exceeded or as a fast fallback.
 */
export function buildLocalSummary(expenses) {
  if (!expenses.length) {
    return {
      totalSpending: 0,
      thisMonthSpend: 0,
      lastMonthSpend: 0,
      spendingHabits: "Upload your first bill to unlock spending insights.",
      spendingPattern: "No expenses yet.",
      monthlyComparison: "No data for monthly comparison yet.",
      categoryInsights: {},
      savingTips: ["Add your first receipt to get personalized tips."],
      overspendingAlerts: [],
      reminders: ["Upload a receipt (JPG/PNG) to begin tracking."],
      aiGenerated: false,
    };
  }

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const monthTotal = (m, y) =>
    expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === m && d.getFullYear() === y;
      })
      .reduce((s, e) => s + e.amount, 0);

  const totalSpending = expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonthSpend = monthTotal(thisMonth, thisYear);
  const lastMonthSpend = monthTotal(lastMonth, lastMonthYear);

  const byCategory = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  }

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const categoryInsights = {};
  for (const [cat, amt] of Object.entries(byCategory)) {
    const pct = Math.round((amt / totalSpending) * 100);
    categoryInsights[cat] = `₹${amt.toLocaleString("en-IN")} spent (${pct}% of total)`;
  }

  const diff = thisMonthSpend - lastMonthSpend;
  const diffPct =
    lastMonthSpend > 0 ? Math.round((diff / lastMonthSpend) * 100) : 0;

  let monthlyComparison;
  if (lastMonthSpend === 0 && thisMonthSpend > 0) {
    monthlyComparison = `This month: ₹${thisMonthSpend.toLocaleString("en-IN")}. No spending recorded last month.`;
  } else if (diff > 0) {
    monthlyComparison = `This month ₹${thisMonthSpend.toLocaleString("en-IN")} is ₹${diff.toLocaleString("en-IN")} (${diffPct}%) higher than last month's ₹${lastMonthSpend.toLocaleString("en-IN")}.`;
  } else if (diff < 0) {
    monthlyComparison = `Great progress! This month ₹${thisMonthSpend.toLocaleString("en-IN")} is ₹${Math.abs(diff).toLocaleString("en-IN")} lower than last month.`;
  } else {
    monthlyComparison = `Spending is steady at ₹${thisMonthSpend.toLocaleString("en-IN")} compared to last month.`;
  }

  const overspendingAlerts = [];
  if (topCategory && topCategory[1] / totalSpending > 0.45) {
    overspendingAlerts.push(
      `${topCategory[0]} accounts for ${Math.round((topCategory[1] / totalSpending) * 100)}% of your spending — consider setting a budget.`
    );
  }
  if (thisMonthSpend > lastMonthSpend * 1.3 && lastMonthSpend > 0) {
    overspendingAlerts.push(
      `This month's spending jumped ${diffPct}% compared to last month. Review recent bills.`
    );
  }

  const savingTips = [
    topCategory
      ? `Your top category is ${topCategory[0]} — track it weekly to avoid overspending.`
      : "Track expenses weekly to spot patterns early.",
    "Use UPI/spending alerts to get notified on large transactions.",
    "Review subscriptions and recharge bills every month.",
  ];

  if (thisMonthSpend > 0) {
    savingTips.push(
      `Average bill size: ₹${Math.round(totalSpending / expenses.length).toLocaleString("en-IN")} — batch small purchases when possible.`
    );
  }

  return {
    totalSpending,
    thisMonthSpend,
    lastMonthSpend,
    spendingHabits: topCategory
      ? `Most spending goes to ${topCategory[0]} (₹${topCategory[1].toLocaleString("en-IN")}). You have ${expenses.length} bills tracked totalling ₹${totalSpending.toLocaleString("en-IN")}.`
      : `You have ${expenses.length} bills tracked.`,
    spendingPattern: `Across ${expenses.length} receipts, your highest spend category is ${topCategory?.[0] || "—"}.`,
    monthlyComparison,
    categoryInsights,
    savingTips,
    overspendingAlerts,
    reminders: [
      "Insights computed locally — use Refresh AI when quota is available.",
      `Last updated from ${expenses.length} expense records.`,
    ],
    aiGenerated: false,
  };
}
