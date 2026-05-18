import mongoose from "mongoose";

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

const expenseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    image: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    merchant: { type: String, default: "Unknown" },
    category: { type: String, default: "Other", enum: CATEGORIES },
    date: { type: Date, default: () => new Date() },
    confidence: { type: Number, min: 0, max: 100, default: 85 },
  },
  { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);
