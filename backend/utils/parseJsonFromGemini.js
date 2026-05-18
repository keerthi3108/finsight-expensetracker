/**
 * Gemini sometimes wraps JSON in markdown fences; strip and parse safely.
 */
export function parseJsonFromGemini(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Empty model response");
  }
  let cleaned = text.trim();
  const fence = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) {
    cleaned = fence[1].trim();
  }
  return JSON.parse(cleaned);
}
