import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import Navbar from "../components/Navbar.jsx";
import SummaryCards from "../components/SummaryCards.jsx";
import DashboardCharts from "../components/DashboardCharts.jsx";
import RecentTransactions from "../components/RecentTransactions.jsx";
import UploadSection from "../components/UploadSection.jsx";
import ExpenseList from "../components/ExpenseList.jsx";
import InsightsPanel from "../components/InsightsPanel.jsx";
import EditExpenseModal from "../components/EditExpenseModal.jsx";
import Toast from "../components/Toast.jsx";
import {
  getTotal,
  getThisMonthSpend,
  getHighestCategory,
  categoryPieData,
  monthlyBarData,
  spendingTrendData,
  filterExpenses,
} from "../utils/expenseStats.js";

export default function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);

  const [listLoading, setListLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [filters, setFilters] = useState({
    category: "All",
    month: "All",
    minAmount: "",
    maxAmount: "",
  });

  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [listError, setListError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [notifBump, setNotifBump] = useState(0);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const loadExpenses = useCallback(async () => {
    setListError("");
    setListLoading(true);
    try {
      const { data } = await api.get("/expenses");
      setExpenses(data);
    } catch (e) {
      const status = e.response?.status;
      if (status === 401) {
        setListError("Session expired. Please log in again.");
      } else {
        setListError(e.response?.data?.error || e.message || "Failed to load expenses");
      }
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadSummary = useCallback(async (useAi = false) => {
    setSummaryError("");
    setSummaryLoading(true);
    try {
      const url = useAi ? "/summary?ai=1" : "/summary";
      const { data } = await api.get(url);
      setSummary(data);
    } catch (e) {
      setSummaryError(e.response?.data?.error || e.message || "Failed to load insights");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
    loadSummary(false);
  }, [loadExpenses, loadSummary]);

  const filteredExpenses = useMemo(
    () => filterExpenses(expenses, filters),
    [expenses, filters]
  );

  const stats = useMemo(
    () => ({
      total: getTotal(expenses),
      monthSpend: getThisMonthSpend(expenses),
      highestCategory: getHighestCategory(expenses),
      billCount: expenses.length,
      pieData: categoryPieData(expenses),
      barData: monthlyBarData(expenses),
      lineData: spendingTrendData(expenses),
    }),
    [expenses]
  );

  const handleUploaded = async (file, { clearSelection }) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("receipt", file);
      const { data } = await api.post("/expenses/upload", fd);
      clearSelection();
      if (data.parseSource === "placeholder") {
        showToast(
          data.message || "Could not read receipt — edit amount and merchant in the list.",
          "warning"
        );
      } else if (data.parseSource === "ocr") {
        showToast(
          data.message ||
            `Scanned locally: ${data.merchant} — verify amount before saving more bills.`,
          "warning"
        );
      } else if (data.parseSource === "groq") {
        showToast(
          `Groq AI: ${data.merchant} — ${data.category} (${data.confidence ?? 85}% confidence)`,
          "success"
        );
      } else {
        showToast(
          `Saved ${data.merchant} — ${data.category} (${data.confidence ?? 85}% confidence)`,
          "success"
        );
      }
      await loadExpenses();
      await loadSummary(false);
      setNotifBump((n) => n + 1);
    } catch (e) {
      showToast(e.response?.data?.error || e.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense permanently?")) return;
    setBusyId(id);
    try {
      await api.delete(`/expenses/${id}`);
      showToast("Expense deleted successfully.", "success");
      await loadExpenses();
      await loadSummary(false);
    } catch (e) {
      showToast(e.response?.data?.error || e.message || "Delete failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveEdit = async (payload) => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      await api.put(`/expenses/${editing._id}`, payload);
      setEditing(null);
      showToast("Expense updated.", "success");
      await loadExpenses();
      await loadSummary(false);
    } catch (e) {
      showToast(e.response?.data?.error || e.message || "Update failed", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="dashboard-app">
      <div className="bg-glow bg-glow-a" />
      <div className="bg-glow bg-glow-b" />

      <Navbar monthlySpend={stats.monthSpend} notifBump={notifBump} />

      <main className="dashboard-main">
        <SummaryCards
          total={stats.total}
          monthSpend={stats.monthSpend}
          highestCategory={stats.highestCategory}
          billCount={stats.billCount}
        />

        <DashboardCharts
          pieData={stats.pieData}
          barData={stats.barData}
          lineData={stats.lineData}
        />

        <RecentTransactions expenses={expenses} />

        <div className="split-grid">
          <UploadSection onUploaded={handleUploaded} disabled={uploading} />
          <InsightsPanel
            summary={summary}
            loading={summaryLoading}
            error={summaryError}
            onRefreshAi={() => loadSummary(true)}
          />
        </div>

        {listLoading ? (
          <div className="loading-panel glass">
            <span className="spinner lg" />
            <p>Loading expenses…</p>
          </div>
        ) : listError ? (
          <div className="loading-panel glass">
            <div className="inline-alert error">{listError}</div>
            <button type="button" className="btn btn-primary" onClick={loadExpenses}>
              Retry
            </button>
          </div>
        ) : (
          <ExpenseList
            expenses={filteredExpenses}
            filters={filters}
            onFilterChange={setFilters}
            onEdit={setEditing}
            onDelete={handleDelete}
            busyId={busyId}
          />
        )}
      </main>

      <EditExpenseModal
        expense={editing}
        saving={savingEdit}
        onClose={() => setEditing(null)}
        onSave={handleSaveEdit}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </div>
  );
}
