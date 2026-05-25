import "./loadEnv.js";
import app from "./app.js";
import { hasGroqKey } from "./utils/groqVision.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  const primary = process.env.RECEIPT_PRIMARY || "gemini";
  if (hasGroqKey()) {
    console.log(`Receipt scanning: Groq enabled (primary=${primary})`);
  } else if (primary === "groq") {
    console.warn("RECEIPT_PRIMARY=groq but GROQ_API_KEY is empty — add key in backend/.env");
  }
});
