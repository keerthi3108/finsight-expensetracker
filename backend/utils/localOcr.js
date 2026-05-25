import { createWorker } from "tesseract.js";
import { parseIndianReceiptText } from "./receiptParse.js";
import { getOcrImageVariants } from "./imagePrep.js";

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("eng");
      return worker;
    })();
  }
  return workerPromise;
}

const PSM_MODES = ["6", "4", "11"]; // block, column, sparse text

function scoreParse(parsed) {
  if (!parsed) return -1;
  return parsed.amount * 10 + parsed.confidence;
}

/**
 * Multi-pass OCR: several image enhancements + page layouts, pick best parse.
 */
export async function extractExpenseFromOcr(source) {
  const variants = await getOcrImageVariants(source);
  const worker = await getWorker();

  let best = null;
  let bestText = "";

  for (const buffer of variants) {
    for (const psm of PSM_MODES) {
      try {
        await worker.setParameters({ tessedit_pageseg_mode: psm });
        const {
          data: { text, confidence },
        } = await worker.recognize(buffer);
        const parsed = parseIndianReceiptText(text, confidence);
        const score = scoreParse(parsed);
        if (score > scoreParse(best)) {
          best = parsed;
          bestText = text;
        }
      } catch (err) {
        console.warn("OCR pass failed:", err.message?.slice(0, 80));
      }
    }
  }

  if (!best) {
    console.warn("OCR raw sample:", bestText.slice(0, 300).replace(/\n/g, " | "));
    throw new Error("OCR could not find a bill total on this image");
  }

  return best;
}
