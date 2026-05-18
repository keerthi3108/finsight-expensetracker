import { useEffect, useState } from "react";
import { CATEGORIES } from "../utils/format.js";

export default function EditExpenseModal({ expense, onClose, onSave, saving }) {
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("Other");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (!expense) return;
    setAmount(String(expense.amount ?? ""));
    setMerchant(String(expense.merchant ?? ""));
    setCategory(String(expense.category ?? "Other"));
    const d = new Date(expense.date);
    setDate(Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10));
  }, [expense]);

  if (!expense) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal glass">
        <div className="modal-head">
          <h3>Edit Expense</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ amount: Number(amount), merchant, category, date });
          }}
        >
          <div className="modal-body">
            <div className="field">
              <label>Amount (₹)</label>
              <input
                className="input"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Merchant</label>
              <input
                className="input"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Category</label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Date</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
