import React, { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Predict() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState("all");

  useEffect(() => {
    axios
      .get(`${API}/predict/waste-risk`)
      .then((r) => {
        setPredictions(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered =
    riskFilter === "all"
      ? predictions
      : predictions.filter((p) => p.risk_level === riskFilter);

  const counts = predictions.reduce((acc, p) => {
    acc[p.risk_level] = (acc[p.risk_level] || 0) + 1;
    return acc;
  }, {});

  const totalValue = predictions
    .filter((p) => p.risk_level === "high")
    .reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1>AI Waste Predictions</h1>
          <p>
            GradientBoosting ML model predicts medicines likely to expire before
            being sold
          </p>
        </div>
        <div
          style={{
            textAlign: "right",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 12,
          }}
        >
          <div style={{ color: "var(--text-muted)" }}>Model</div>
          <div style={{ color: "var(--accent-blue)", fontWeight: 600 }}>
            GradientBoostingClassifier
          </div>
          <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
            Trained on 5,000 samples
          </div>
        </div>
      </div>

      {/* Model Info Banner */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(183,148,244,0.1) 100%)",
          border: "1px solid rgba(102,126,234,0.2)",
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 28,
          display: "flex",
          gap: 32,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 6,
            }}
          >
            Features Used
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Days to Expiry Â· Stock Quantity Â· Unit Price Â· Estimated Demand Rate
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 6,
            }}
          >
            Risk Logic
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            High Risk = quantity exceeds projected sales before expiry
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 6,
            }}
          >
            High Risk Items
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--accent-red)",
            }}
          >
            {totalValue} units
          </div>
        </div>
      </div>

      {/* Risk Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          {
            key: "high",
            label: "High Risk",
            icon: "ðŸ”´",
            color: "danger",
            desc: "Will expire before sale",
          },
          {
            key: "medium",
            label: "Medium Risk",
            icon: "ðŸŸ¡",
            color: "warning",
            desc: "Needs monitoring",
          },
          {
            key: "low",
            label: "Low Risk",
            icon: "ðŸŸ¢",
            color: "success",
            desc: "Safe to hold",
          },
        ].map((s) => (
          <div
            key={s.key}
            className={`stat-card ${s.color}`}
            style={{
              cursor: "pointer",
              outline:
                riskFilter === s.key ? "2px solid var(--accent-blue)" : "none",
            }}
            onClick={() => setRiskFilter(riskFilter === s.key ? "all" : s.key)}
          >
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-value">{counts[s.key] || 0}</div>
            <div className="stat-label">{s.label}</div>
            <div
              className="stat-change"
              style={{ color: "var(--text-muted)", fontSize: 12 }}
            >
              {s.desc}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>ðŸ¤– Waste Risk Analysis</h2>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {filtered.length} items
          </span>
        </div>
        {loading ? (
          <div className="spinner" />
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch</th>
                  <th>Stock (units)</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Risk Score</th>
                  <th>Waste Risk Level</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const riskColor =
                    p.risk_level === "high"
                      ? "var(--accent-red)"
                      : p.risk_level === "medium"
                        ? "var(--accent-orange)"
                        : "var(--accent-green)";
                  const pct = Math.round(p.waste_risk_score * 100);
                  const rec =
                    p.risk_level === "high"
                      ? "ðŸš¨ Discount & promote urgently"
                      : p.risk_level === "medium"
                        ? "âš ï¸ Monitor & consider promotion"
                        : "âœ… No action needed";
                  return (
                    <tr key={p.inventory_id}>
                      <td>
                        <div className="medicine-name">{p.medicine_name}</div>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                        {p.batch_number || "â€”"}
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.quantity}</td>
                      <td
                        style={{ fontSize: 13, color: "var(--text-secondary)" }}
                      >
                        {p.expiry_date || "â€”"}
                      </td>
                      <td style={{ fontWeight: 700, color: riskColor }}>
                        {p.days_to_expiry !== null &&
                        p.days_to_expiry !== undefined
                          ? p.days_to_expiry < 0
                            ? `${Math.abs(p.days_to_expiry)}d ago`
                            : `${p.days_to_expiry}d`
                          : "â€”"}
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div className="risk-bar" style={{ flex: 1 }}>
                            <div
                              className={`risk-fill ${p.risk_level}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: riskColor,
                              minWidth: 36,
                            }}
                          >
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${p.risk_level === "high" ? "badge-expired" : p.risk_level === "medium" ? "badge-near-expiry" : "badge-active"}`}
                        >
                          {p.risk_level === "high"
                            ? "ðŸ”´ High"
                            : p.risk_level === "medium"
                              ? "ðŸŸ¡ Medium"
                              : "ðŸŸ¢ Low"}
                        </span>
                      </td>
                      <td
                        style={{ fontSize: 12, color: "var(--text-secondary)" }}
                      >
                        {rec}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
