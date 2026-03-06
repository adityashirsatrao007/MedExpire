import React, { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const STATUS_CONFIG = {
  expired: {
    badge: "badge-expired",
    label: "âŒ Expired",
    color: "var(--accent-red)",
  },
  near_expiry: {
    badge: "badge-near-expiry",
    label: "âš ï¸ Near Expiry",
    color: "var(--accent-orange)",
  },
  expiring_soon: {
    badge: "badge-expiring-soon",
    label: "â° Expiring Soon",
    color: "#fbd38d",
  },
  low_stock: {
    badge: "badge-low-stock",
    label: "ðŸ“‰ Low Stock",
    color: "var(--accent-purple)",
  },
  active: {
    badge: "badge-active",
    label: "âœ… Active",
    color: "var(--accent-green)",
  },
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    medicine_name: "",
    batch_number: "",
    quantity: "",
    unit_price: "",
    expiry_date: "",
    supplier: "",
    location: "Main Shelf",
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    axios
      .get(`${API}/inventory/?limit=300`)
      .then((r) => {
        setItems(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((item) => {
    const matchStatus = filter === "all" || item.status === filter;
    const matchSearch =
      !search ||
      item.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.batch_number || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const deleteItem = async (id) => {
    if (!window.confirm("Remove this inventory item?")) return;
    await axios.delete(`${API}/inventory/${id}`);
    load();
  };

  const saveItem = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/inventory/`, {
        ...form,
        quantity: parseInt(form.quantity) || 0,
        unit_price: parseFloat(form.unit_price) || 0,
        expiry_date: form.expiry_date || null,
      });
      setShowAddModal(false);
      setForm({
        medicine_name: "",
        batch_number: "",
        quantity: "",
        unit_price: "",
        expiry_date: "",
        supplier: "",
        location: "Main Shelf",
      });
      load();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const statusCounts = items.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p>{items.length} items tracked across all locations</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          âž• Add Item
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="input-group" style={{ flex: 1, maxWidth: 320 }}>
          <span className="input-icon">ðŸ”</span>
          <input
            className="input with-icon"
            placeholder="Search medicine or batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {[
          { key: "all", label: `All (${items.length})` },
          { key: "expired", label: `Expired (${statusCounts.expired || 0})` },
          {
            key: "near_expiry",
            label: `Near Expiry (${statusCounts.near_expiry || 0})`,
          },
          {
            key: "expiring_soon",
            label: `< 90d (${statusCounts.expiring_soon || 0})`,
          },
          { key: "active", label: `Active (${statusCounts.active || 0})` },
        ].map((f) => (
          <button
            key={f.key}
            className={`btn btn-sm ${filter === f.key ? "btn-primary" : "btn-outline"}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner" />
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Location</th>
                  <th>Waste Risk</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="empty-state">
                        <span className="empty-state-icon">ðŸ“¦</span>
                        <h3>No items found</h3>
                        <p>Try a different filter or search term</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const sc =
                      STATUS_CONFIG[item.status] || STATUS_CONFIG.active;
                    const risk = item.waste_risk_score || 0;
                    const riskLvl =
                      risk > 0.7 ? "high" : risk > 0.4 ? "medium" : "low";
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="medicine-name">
                            {item.medicine_name}
                          </div>
                          <div className="medicine-meta">
                            {item.supplier || "â€”"}
                          </div>
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                          {item.batch_number || "â€”"}
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ color: "var(--text-secondary)" }}>
                          â‚¹{item.unit_price?.toFixed(0) || "â€”"}
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {item.expiry_date || "â€”"}
                        </td>
                        <td style={{ fontWeight: 700, color: sc.color }}>
                          {item.days_to_expiry !== null &&
                          item.days_to_expiry !== undefined
                            ? item.days_to_expiry < 0
                              ? `${Math.abs(item.days_to_expiry)}d ago`
                              : `${item.days_to_expiry}d`
                            : "â€”"}
                        </td>
                        <td
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          {item.location}
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <div
                            style={{
                              fontSize: 12,
                              color:
                                riskLvl === "high"
                                  ? "var(--accent-red)"
                                  : riskLvl === "medium"
                                    ? "var(--accent-orange)"
                                    : "var(--accent-green)",
                            }}
                          >
                            {(risk * 100).toFixed(0)}%
                          </div>
                          <div className="risk-bar">
                            <div
                              className={`risk-fill ${riskLvl}`}
                              style={{ width: `${risk * 100}%` }}
                            />
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${sc.badge}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => deleteItem(item.id)}
                          >
                            ðŸ—‘
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 32,
              width: 480,
              maxWidth: "90vw",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
              âž• Add Inventory Item
            </h2>
            <div style={{ display: "grid", gap: 14 }}>
              {[
                {
                  label: "Medicine Name *",
                  key: "medicine_name",
                  type: "text",
                  placeholder: "e.g. Amoxicillin 500mg",
                },
                {
                  label: "Batch Number",
                  key: "batch_number",
                  type: "text",
                  placeholder: "e.g. B1234A",
                },
                {
                  label: "Quantity",
                  key: "quantity",
                  type: "number",
                  placeholder: "100",
                },
                {
                  label: "Unit Price (â‚¹)",
                  key: "unit_price",
                  type: "number",
                  placeholder: "50.00",
                },
                {
                  label: "Expiry Date",
                  key: "expiry_date",
                  type: "date",
                  placeholder: "",
                },
                {
                  label: "Supplier",
                  key: "supplier",
                  type: "text",
                  placeholder: "Supplier name",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {f.label}
                  </label>
                  <input
                    className="input"
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={saveItem}
                disabled={saving}
              >
                {saving ? "â³ Saving..." : "ðŸ’¾ Save Item"}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
