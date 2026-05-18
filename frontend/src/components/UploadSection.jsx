import { useCallback, useRef, useState } from "react";

const ACCEPT = "image/png,image/jpeg,.jpg,.jpeg,.png";

export default function UploadSection({ onUploaded, disabled }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");

  const pickFile = useCallback(
    (f) => {
      setError("");
      if (!f) return;
      if (!["image/jpeg", "image/png"].includes(f.type)) {
        setError("Only JPG or PNG images are allowed.");
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
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
          <p>AI extracts amount, merchant, category & date in ₹</p>
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
        <p className="upload-hint">or click to browse · JPG/PNG</p>
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
                AI analyzing receipt…
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
              <span className="spinner" /> Processing with Gemini…
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
