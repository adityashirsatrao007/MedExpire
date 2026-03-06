import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const COLORS = ["#f43f5e", "#f59e0b", "#fbbf24", "#22c55e", "#14b8a6"];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/inventory/stats`),
      axios.get(`${API}/inventory/?limit=300`),
    ])
      .then(([s, inv]) => {
        setStats(s.data);
        setInventory(inv.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const expiryDistribution = React.useMemo(() => {
    const bins = {
      Expired: 0,
      "< 30d": 0,
      "30â€“90d": 0,
      "90â€“180d": 0,
      "180d+": 0,
    };
    inventory.forEach((item) => {
      const d = item.days_to_expiry;
      if (d === null || d === undefined) return;
      if (d < 0) bins["Expired"]++;
      else if (d <= 30) bins["< 30d"]++;
      else if (d <= 90) bins["30â€“90d"]++;
      else if (d <= 180) bins["90â€“180d"]++;
      else bins["180d+"]++;
    });
    return Object.entries(bins).map(([name, value]) => ({ name, value }));
  }, [inventory]);

  const trendData = [
    { month: "Oct", expired: 3, nearExpiry: 8 },
    { month: "Nov", expired: 5, nearExpiry: 12 },
    { month: "Dec", expired: 4, nearExpiry: 10 },
    { month: "Jan", expired: 7, nearExpiry: 15 },
    { month: "Feb", expired: 6, nearExpiry: 18 },
    {
      month: "Mar",
      expired: stats?.expired_count || 8,
      nearExpiry: stats?.expiring_30_days || 14,
    },
  ];

  if (loading)
    return (
      <div className="page-wrapper">
        <div className="spinner" />
      </div>
    );

  const statCards = [
    {
      label: "Total Medicines",
      value: stats?.total_medicines || 0,
      icon: "ðŸ’Š",
      type: "info",
      note: "In database",
    },
    {
      label: "Expired",
      value: stats?.expired_count || 0,
      icon: "âŒ",
      type: "danger",
      note: "Remove immediately",
    },
    {
      label: "Expiring < 30d",
      value: stats?.expiring_30_days || 0,
      icon: "âš ï¸",
      type: "warning",
      note: "Urgent action needed",
    },
    {
      label: "Expiring < 90d",
      value: stats?.expiring_90_days || 0,
      icon: "â°",
      type: "warning",
      note: "Monitor closely",
    },
    {
      label: "Total Stock",
      value: stats?.total_inventory_items || 0,
      icon: "ðŸ“¦",
      type: "success",
      note: "Inventory items",
    },
    {
      label: "Active Alerts",
      value: stats?.total_alerts || 0,
      icon: "ðŸ””",
      type: "danger",
      note: "Unread alerts",
    },
    {
      label: "Avg Waste Risk",
      value: `${((stats?.avg_waste_risk || 0) * 100).toFixed(1)}%`,
      icon: "ðŸ¤–",
      type: "info",
      note: "AI prediction",
    },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
          }}
        >
          <p style={{ color: "var(--text3)", marginBottom: 4 }}>{label}</p>
          {payload.map((p) => (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}: <strong>{p.value}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>AI-powered medicine expiry tracking overview</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>
            Updated: {new Date().toLocaleString()}
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() =>
              axios
                .post(`${API}/alerts/generate`)
                .then(() => window.location.reload())
            }
          >
            ðŸ”„ Refresh Alerts
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((c) => (
          <div key={c.label} className={`stat-card ${c.type}`}>
            <div className="accent-bar" />
            <span className="stat-icon">{c.icon}</span>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-change">{c.note}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <h2>ðŸ“ˆ Expiry Trend (6 months)</h2>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fc8181" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fc8181" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorNear" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f6ad55" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f6ad55" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="month"
                  stroke="#718096"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#718096" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="expired"
                  name="Expired"
                  stroke="#fc8181"
                  fill="url(#colorExp)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="nearExpiry"
                  name="Near Expiry"
                  stroke="#f6ad55"
                  fill="url(#colorNear)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>ðŸ¥§ Expiry Distribution</h2>
          </div>
          <div
            className="card-body"
            style={{ display: "flex", alignItems: "center", gap: 24 }}
          >
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={expiryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {expiryDistribution.map((e, i) => (
                    <Cell key={e.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0f1628",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {expiryDistribution.map((e, i) => (
                <div
                  key={e.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: COLORS[i % COLORS.length],
                      }}
                    />
                    <span
                      style={{ fontSize: 13, color: "var(--text-secondary)" }}
                    >
                      {e.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {e.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Inventory with Issues */}
      <div className="card">
        <div className="card-header">
          <h2>âš ï¸ Items Needing Attention</h2>
          <a href="/inventory" className="btn btn-outline btn-sm">
            View All
          </a>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Batch</th>
                <th>Qty</th>
                <th>Expiry Date</th>
                <th>Days Left</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory
                .filter((i) =>
                  ["expired", "near_expiry", "expiring_soon"].includes(
                    i.status,
                  ),
                )
                .slice(0, 10)
                .map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="medicine-name">{item.medicine_name}</div>
                      <div className="medicine-meta">{item.supplier}</div>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                      {item.batch_number || "â€”"}
                    </td>
                    <td>{item.quantity}</td>
                    <td
                      style={{ color: "var(--text-secondary)", fontSize: 13 }}
                    >
                      {item.expiry_date}
                    </td>
                    <td
                      style={{
                        fontWeight: 600,
                        color:
                          item.days_to_expiry < 0
                            ? "var(--accent-red)"
                            : item.days_to_expiry <= 30
                              ? "var(--accent-orange)"
                              : "#fbd38d",
                      }}
                    >
                      {item.days_to_expiry < 0
                        ? `${Math.abs(item.days_to_expiry)}d ago`
                        : `${item.days_to_expiry}d`}
                    </td>
                    <td>
                      <span
                        className={`badge badge-${item.status === "near_expiry" ? "near-expiry" : item.status === "expiring_soon" ? "expiring-soon" : item.status}`}
                      >
                        {item.status === "expired"
                          ? "âŒ Expired"
                          : item.status === "near_expiry"
                            ? "âš ï¸ Near Expiry"
                            : "â° Expiring Soon"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
