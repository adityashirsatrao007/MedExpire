import React, { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const SEVERITY_CONFIG = {
  critical: {
    color: "var(--accent-red)",
    icon: "ðŸš¨",
    bg: "rgba(252,129,129,0.1)",
  },
  high: {
    color: "var(--accent-orange)",
    icon: "âš ï¸",
    bg: "rgba(246,173,85,0.1)",
  },
  medium: { color: "#fbd38d", icon: "â°", bg: "rgba(251,211,141,0.08)" },
  low: {
    color: "var(--accent-green)",
    icon: "â„¹ï¸",
    bg: "rgba(104,211,145,0.08)",
  },
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setSeverityFilter] = useState("all");
  const [generating, setGenerating] = useState(false);

  const load = () => {
    setLoading(true);
    axios
      .get(`${API}/alerts/`)
      .then((r) => {
        setAlerts(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const dismiss = async (id) => {
    await axios.post(`${API}/alerts/dismiss/${id}`);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const generateAlerts = async () => {
    setGenerating(true);
    await axios.post(`${API}/alerts/generate`);
    load();
    setGenerating(false);
  };

  const clearDismissed = async () => {
    await axios.delete(`${API}/alerts/clear-dismissed`);
    load();
  };

  const filtered =
    filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  const counts = alerts.reduce((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1>Alerts</h1>
          <p>{alerts.length} active alerts requiring pharmacist attention</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={clearDismissed}>
            ðŸ—‘ Clear Dismissed
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={generateAlerts}
            disabled={generating}
          >
            {generating ? "â³ Scanning..." : "ðŸ”„ Scan Inventory"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { key: "critical", label: "Critical", icon: "ðŸš¨" },
          { key: "high", label: "High", icon: "âš ï¸" },
          { key: "medium", label: "Medium", icon: "â°" },
          { key: "low", label: "Low", icon: "â„¹ï¸" },
        ].map((s) => (
          <div
            key={s.key}
            className={`stat-card ${s.key === "critical" ? "danger" : s.key === "high" ? "warning" : "info"}`}
            style={{
              cursor: "pointer",
              outline:
                filter === s.key ? "2px solid var(--accent-blue)" : "none",
            }}
            onClick={() => setSeverityFilter(filter === s.key ? "all" : s.key)}
          >
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-value">{counts[s.key] || 0}</div>
            <div className="stat-label">{s.label} Alerts</div>
          </div>
        ))}
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">âœ…</span>
          <h3>No active alerts</h3>
          <p>
            All medicines are within safe expiry range. Click "Scan Inventory"
            to refresh.
          </p>
        </div>
      ) : (
        filtered.map((alert) => {
          const sc = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
          return (
            <div key={alert.id} className={`alert-card ${alert.severity}`}>
              <div
                className={`alert-icon-wrap ${alert.severity}`}
                style={{ background: sc.bg }}
              >
                <span>{sc.icon}</span>
              </div>
              <div className="alert-content">
                <div className="alert-title">{alert.medicine_name}</div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-meta">
                  <span>Batch: {alert.batch_number || "N/A"}</span>
                  <span>Â·</span>
                  <span>Stock: {alert.quantity} units</span>
                  {alert.days_to_expiry !== null && (
                    <>
                      <span>Â·</span>
                      <span style={{ color: sc.color }}>
                        {alert.days_to_expiry < 0
                          ? `Expired ${Math.abs(alert.days_to_expiry)} days ago`
                          : `Expires in ${alert.days_to_expiry} days`}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  alignItems: "flex-end",
                  flexShrink: 0,
                }}
              >
                <span
                  className={`badge ${alert.severity === "critical" ? "badge-expired" : alert.severity === "high" ? "badge-near-expiry" : "badge-expiring-soon"}`}
                >
                  {sc.icon}{" "}
                  {alert.severity.charAt(0).toUpperCase() +
                    alert.severity.slice(1)}
                </span>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => dismiss(alert.id)}
                >
                  âœ“ Dismiss
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
