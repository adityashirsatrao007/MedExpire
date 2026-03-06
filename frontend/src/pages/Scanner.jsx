import React, { useState, useRef } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Public medicine images (work both locally and on Vercel)
const SAMPLE_IMAGES = [
  {
    url: "https://images.pexels.com/photos/139398/thermometer-headache-pain-pills-139398.jpeg?w=600",
    label: "Tablet Strip",
    desc: "Tablet blister pack with expiry label",
  },
  {
    url: "https://images.pexels.com/photos/208512/pexels-photo-208512.jpeg?w=600",
    label: "Medicine Box",
    desc: "Medicine carton with printed label & batch number",
  },
  {
    url: "https://images.pexels.com/photos/3683065/pexels-photo-3683065.jpeg?w=600",
    label: "Pharmaceutical Pack",
    desc: "Close-up of pharmaceutical tablet packaging",
  },
  {
    url: "https://images.pexels.com/photos/9742916/pexels-photo-9742916.jpeg?w=600",
    label: "Supplement Bottle",
    desc: "Supplement bottle with expiry date on label",
  },
  {
    url: "https://images.pexels.com/photos/5863391/pexels-photo-5863391.jpeg?w=600",
    label: "Pharmacy Stock",
    desc: "Pharmacy shelf with various medicine packs",
  },
];

export default function Scanner() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragover, setDragover] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const fileRef = useRef();

  const handleFile = (f) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setAdded(false);
    setSelectedSample(null);
  };

  // Load a sample image from the backend and convert to a File object
  const loadSampleImage = async (sample) => {
    setSelectedSample(sample.url);
    setResult(null);
    setAdded(false);
    try {
      const res = await fetch(sample.url);
      const blob = await res.blob();
      const name = sample.url.split("/").pop();
      const f = new File([blob], name, { type: blob.type || "image/jpeg" });
      setFile(f);
      setPreview(URL.createObjectURL(blob));
    } catch (e) {
      console.error("Failed to load sample:", e);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const scanImage = async () => {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await axios.post(`${API}/ocr/scan`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
    } catch (e) {
      setResult({
        success: false,
        raw_text: "",
        confidence: 0,
        message:
          "Could not connect to backend. On Vercel, the scanner runs in demo mode — please upload an image and click Scan again.",
      });
    }
    setLoading(false);
  };

  const addToInventory = async () => {
    if (!result) return;
    setAdding(true);
    try {
      let expiryDate = null;
      if (result.expiry_date) {
        const m = result.expiry_date.match(/(\d{1,2})[/-](\d{2,4})/);
        if (m) {
          const month = m[1].padStart(2, "0");
          const year = m[2].length === 2 ? `20${m[2]}` : m[2];
          expiryDate = `${year}-${month}-01`;
        }
      }
      await axios.post(`${API}/inventory/`, {
        medicine_name: result.medicine_name || "Unknown Medicine",
        batch_number: result.batch_number,
        expiry_date: expiryDate,
        quantity: 50,
        unit_price: 100.0,
      });
      setAdded(true);
    } catch (e) {
      console.error(e);
    }
    setAdding(false);
  };

  const confidencePct = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>AI Medicine Scanner</h1>
          <p>
            Upload a medicine label or pick a sample â€” TrOCR reads the expiry
            date automatically
          </p>
        </div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r3)",
            padding: "10px 14px",
            fontSize: 12,
            lineHeight: 1.7,
            color: "var(--text3)",
          }}
        >
          <div
            style={{
              color: "var(--teal)",
              fontWeight: 600,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: ".5px",
            }}
          >
            Model
          </div>
          <div style={{ color: "var(--text)", fontWeight: 600 }}>
            microsoft/trocr-base-printed
          </div>
          <div>HuggingFace Transformers</div>
        </div>
      </div>

      {/* Sample Images Section */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2>ðŸ“¦ Real Medicine Label Samples</h2>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>
            Click any image to load it for OCR scanning
          </span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 12 }}>
            These are{" "}
            <strong style={{ color: "var(--text2)" }}>
              real pharmaceutical packaging images
            </strong>{" "}
            sourced from Wikimedia Commons and Pexels. Select one to demonstrate
            TrOCR text extraction on actual medicine labels.
          </p>
          <div className="sample-images-grid">
            {SAMPLE_IMAGES.map((s) => (
              <div
                key={s.url}
                className={`sample-tile ${selectedSample === s.url ? "selected" : ""}`}
                onClick={() => loadSampleImage(s)}
                title={s.desc}
              >
                <img
                  src={s.url}
                  alt={s.label}
                  onError={(e) => {
                    e.target.parentElement.style.background = "var(--surface2)";
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML += `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:24px;color:var(--text3)">ðŸ–¼</div>`;
                  }}
                />
                <div className="sample-tile-label">{s.label}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 10 }}>
            ðŸ’¡ Source: Wikimedia Commons (public domain) Â· Pexels (free
            license) Â· For best OCR results, use images where text like "EXP:",
            "Batch:", "Use Before:" is clearly visible.
          </p>
        </div>
      </div>

      {/* Upload + Results */}
      <div className="grid-2">
        {/* Upload area */}
        <div>
          <div
            className={`upload-zone ${dragover ? "dragover" : ""}`}
            onClick={() => fileRef.current.click()}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragover(true);
            }}
            onDragLeave={() => setDragover(false)}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {preview ? (
              <img src={preview} alt="Medicine label" className="img-preview" />
            ) : (
              <>
                <span className="upload-zone-icon">ðŸ“·</span>
                <h3>Drop or click to upload</h3>
                <p>JPG, PNG, WEBP Â· or pick a sample above</p>
              </>
            )}
          </div>

          {file && (
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={scanImage}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? "â³ Scanning..." : "ðŸ” Scan with TrOCR"}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setResult(null);
                  setAdded(false);
                  setSelectedSample(null);
                }}
              >
                âœ•
              </button>
            </div>
          )}

          {loading && (
            <div
              style={{
                textAlign: "center",
                paddingTop: 8,
                fontSize: 13,
                color: "var(--text3)",
              }}
            >
              <div className="spinner" style={{ margin: "12px auto 8px" }} />
              Running TrOCR inferenceâ€¦ first load downloads ~250MB model
            </div>
          )}

          {/* How it works */}
          <div
            style={{
              marginTop: 16,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".5px",
                color: "var(--text3)",
                marginBottom: 10,
              }}
            >
              How it works
            </div>
            {[
              ["1.", "Image â†’ HuggingFace TrOCR model"],
              ["2.", "Raw printed text extracted"],
              ["3.", "Regex parses EXP date, Batch No., Name"],
              ["4.", "Results logged + optionally saved to inventory"],
            ].map(([n, t]) => (
              <div
                key={n}
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 8,
                  fontSize: 12,
                  color: "var(--text2)",
                }}
              >
                <span
                  style={{
                    color: "var(--teal)",
                    fontWeight: 700,
                    minWidth: 16,
                  }}
                >
                  {n}
                </span>
                <span>{t}</span>
              </div>
            ))}
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--text3)" }}>
              <strong style={{ color: "var(--text2)" }}>
                Supported expiry formats:
              </strong>
              <div
                style={{
                  fontFamily: "monospace",
                  marginTop: 4,
                  lineHeight: 1.8,
                }}
              >
                EXP: 03/2025 Â· Use before Jan 2026
                <br />
                Expiry: 06-25 Â· EXP.DATE 12/2024
              </div>
            </div>
          </div>
        </div>

        {/* Results panel */}
        <div>
          {result ? (
            <>
              {result.success ? (
                <>
                  <div className="ocr-result-card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--teal)",
                        }}
                      >
                        âœ… Extraction Complete
                      </span>
                      <span className="badge badge-active">TrOCR</span>
                    </div>

                    <div className="ocr-field">
                      <span className="ocr-field-label">Medicine Name</span>
                      <span className="ocr-field-value">
                        {result.medicine_name || "â€”"}
                      </span>
                    </div>
                    <div className="ocr-field">
                      <span className="ocr-field-label">Expiry Date</span>
                      <span
                        className="ocr-field-value"
                        style={{ color: "var(--amber)" }}
                      >
                        {result.expiry_date || "â€”"}
                      </span>
                    </div>
                    <div className="ocr-field">
                      <span className="ocr-field-label">Batch Number</span>
                      <span
                        className="ocr-field-value"
                        style={{ fontFamily: "monospace", fontSize: 13 }}
                      >
                        {result.batch_number || "â€”"}
                      </span>
                    </div>
                    <div className="ocr-field">
                      <span className="ocr-field-label">Confidence</span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          className="confidence-track"
                          style={{ width: 100 }}
                        >
                          <div
                            className="confidence-fill"
                            style={{ width: `${confidencePct}%` }}
                          />
                        </div>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color:
                              confidencePct > 60
                                ? "var(--green)"
                                : "var(--amber)",
                          }}
                        >
                          {confidencePct}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Raw text */}
                  <div
                    style={{
                      marginTop: 12,
                      padding: 14,
                      background: "var(--bg)",
                      borderRadius: "var(--r3)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: ".5px",
                        color: "var(--text3)",
                        marginBottom: 6,
                      }}
                    >
                      Raw OCR Output
                    </div>
                    <pre
                      style={{
                        fontSize: 12,
                        fontFamily: "monospace",
                        color: "var(--text2)",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        maxHeight: 140,
                        overflowY: "auto",
                      }}
                    >
                      {result.raw_text || "(no text extracted)"}
                    </pre>
                  </div>

                  {!added ? (
                    <button
                      className="btn btn-success"
                      style={{ marginTop: 12, width: "100%" }}
                      onClick={addToInventory}
                      disabled={adding}
                    >
                      {adding ? "â³ Savingâ€¦" : "âž• Add to Inventory"}
                    </button>
                  ) : (
                    <div
                      style={{
                        marginTop: 12,
                        textAlign: "center",
                        padding: 12,
                        background: "var(--green-dim)",
                        borderRadius: "var(--r3)",
                        border: "1px solid rgba(34,197,94,.2)",
                        color: "var(--green)",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      âœ… Saved to inventory
                    </div>
                  )}
                </>
              ) : (
                <div className="card">
                  <div className="card-body empty-state">
                    <span className="empty-state-icon">âš ï¸</span>
                    <h3>Extraction Failed</h3>
                    <p>{result.message}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div
              className="card"
              style={{
                height: "100%",
                minHeight: 320,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text3)",
                  padding: 28,
                }}
              >
                <div style={{ fontSize: 44, marginBottom: 14 }}>ðŸ¤–</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text2)",
                    marginBottom: 8,
                  }}
                >
                  Ready to scan
                </div>
                <p style={{ fontSize: 13, maxWidth: 240, margin: "0 auto" }}>
                  Select a sample image above or upload your own medicine label
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
