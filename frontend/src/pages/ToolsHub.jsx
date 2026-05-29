import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PackingList from "../components/PackingList";
import EmergencyPanel from "../components/EmergencyPanel";

const TABS = [
  { key: "packing", label: "Packing List", icon: "\u{1F9F3}" },
  { key: "emergency", label: "Emergency & Safety", icon: "\u{1F6A8}" },
];

function ToolsHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("packing");

  return (
    <div className="main-content">
      <button className="back-btn" onClick={() => navigate("/")}>&larr; Back</button>
      <div className="page-header">
        <div>
          <h2>{'\u{1F9F0}'} Travel Tools</h2>
          <p className="text-muted">Packing lists, emergency info, and more</p>
        </div>
      </div>

      <div className="tools-tabs">
        {TABS.map((tab) => (
          <button key={tab.key} className={`tools-tab ${activeTab === tab.key ? "active" : ""}`} onClick={() => setActiveTab(tab.key)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "packing" && <PackingList />}
      {activeTab === "emergency" && <EmergencyPanel />}
    </div>
  );
}

export default ToolsHub;
