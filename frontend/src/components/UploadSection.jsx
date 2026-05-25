import { useCallback, useRef, useState } from "react";
import { prepareReceiptFile } from "../utils/prepareReceiptImage.js";

const ACCEPT = "image/png,image/jpeg,.jpg,.jpeg,.png";
const MIN_WIDTH_WARN = 600;

export default function UploadSection({ onUploaded, disabled }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");

  const pickFile = useCallback(
    async (f) => {
      setError("");
      if (!f) return;
      if (!["image/jpeg", "image/png"].includes(f.type)) {
        setError("Only JPG or PNG images are allowed.");
        return;
      }
      try {
        const prepared = await prepareReceiptFile(f);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(prepared);
        setPreviewUrl(URL.createObjectURL(prepared));

        const dimUrl = URL.createObjectURL(prepared);
        const dims = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve({ w: 0, h: 0 });
          img.src = dimUrl;
        });
        URL.revokeObjectURL(dimUrl);
        if (dims.w > 0 && dims.w < MIN_WIDTH_WARN) {
          setError(
            "Image is very small — use a clearer photo of the full bill (not a tiny screenshot)."
          );
        }
      } catch {
        setError("Could not process this image. Try another JPG/PNG.");
      }
    },
    [previewUrl]
  );

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setFile(null);
    setError("");
  };

  return (
    <section className="upload-panel glass">
      <div className="section-head compact">
        <div>
          <h2>Upload Bill</h2>
          <p>Groq / Gemini reads amount, merchant, category & date in ₹</p>
        </div>
      </div>

      <div
        className={`upload-dropzone ${drag ? "is-dragging" : ""} ${disabled ? "is-busy" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <div className="upload-icon-wrap">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="upload-title">Drag & drop receipt here</p>
        <p className="upload-hint">
          JPG/PNG · full bill in good light · avoid blurry screenshots
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {error && <div className="inline-alert error">{error}</div>}

      {previewUrl && (
        <div className="upload-preview">
          <img src={previewUrl} alt="Receipt preview" />
          {disabled && (
            <div className="scan-overlay">
              <div className="scan-line" />
              <div className="scan-text">
                <span className="spinner lg" />
                Scanning receipt… (may take up to 1 min)
              </div>
            </div>
          )}
        </div>
      )}

      <div className="upload-actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!file || disabled}
          onClick={() => file && onUploaded(file, { clearSelection })}
        >
          {disabled ? (
            <>
              <span className="spinner" /> Scanning receipt…
            </>
          ) : (
            "Analyze & Save Expense"
          )}
        </button>
        {file && !disabled && (
          <button type="button" className="btn btn-ghost" onClick={clearSelection}>
            Clear
          </button>
        )}
      </div>
    </section>
  );
}
