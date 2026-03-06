import React from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import "./index.css";
import Dashboard from "./pages/Dashboard";
import Scanner from "./pages/Scanner";
import Inventory from "./pages/Inventory";
import Alerts from "./pages/Alerts";
import Predict from "./pages/Predict";

function Sidebar() {
  const nav = [
    { to: "/", icon: "📊", label: "Dashboard" },
    { to: "/scanner", icon: "📷", label: "AI Scanner" },
    { to: "/inventory", icon: "💊", label: "Inventory" },
    { to: "/alerts", icon: "🔔", label: "Alerts" },
    { to: "/predict", icon: "🤖", label: "AI Predictions" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">💊</div>
        <div className="logo-text">
          <h1>MedExpire</h1>
          <span>Expiry Tracking AI</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="badge-version">v1.0.0 · HuggingFace TrOCR</span>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/predict" element={<Predict />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
