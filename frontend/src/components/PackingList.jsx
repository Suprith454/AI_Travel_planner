import { useState } from "react";
import { tools } from "../api";
import { useToast } from "./Toast";

const CLIMATE_OPTIONS = [
  { value: "hot", label: "Hot / Tropical", icon: "\u{1F525}" },
  { value: "cold", label: "Cold / Freezing", icon: "\u{2744}\uFE0F" },
  { value: "rainy", label: "Rainy / Monsoon", icon: "\u{1F327}\uFE0F" },
  { value: "temperate", label: "Temperate / Mild", icon: "\u{1F31E}" },
];

function PackingList() {
  const { addToast } = useToast();
  const [form, setForm] = useState({ destination: "", days: "", climate: "hot", international: false, religious_sites: false });
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState(null);
  const [checked, setChecked] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked: ch } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? ch : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.destination.trim() || !form.days) {
      addToast("Destination and days required", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await tools.packingList(form.destination, parseInt(form.days), form.climate, form.international, form.religious_sites);
      setList(data);
      setChecked({});
    } catch (err) {
      addToast("Failed to generate packing list: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (key) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalItems = list ? Object.values(list.categories).flat().length : 0;
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="packing-list">
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>{'\u{1F9F3}'} Packing List Generator</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Destination</label>
              <input name="destination" value={form.destination} onChange={handleChange} placeholder="e.g. Goa, Paris" required />
            </div>
            <div className="form-group">
              <label>Days</label>
              <input name="days" type="number" min="1" value={form.days} onChange={handleChange} placeholder="5" required />
            </div>
          </div>
          <div className="form-group">
            <label>Climate</label>
            <div className="climate-selector">
              {CLIMATE_OPTIONS.map((c) => (
                <button key={c.value} type="button" className={`climate-option ${form.climate === c.value ? "active" : ""}`} onClick={() => setForm({ ...form, climate: c.value })}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label className="packing-checkbox">
              <input type="checkbox" name="international" checked={form.international} onChange={handleChange} />
              <span>{'\u{1F30D}'} International Trip</span>
            </label>
            <label className="packing-checkbox">
              <input type="checkbox" name="religious_sites" checked={form.religious_sites} onChange={handleChange} />
              <span>{'\u{1F54A}\uFE0F'} Visiting Religious Sites</span>
            </label>
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : "\u{1F9F3}"} Generate Packing List
          </button>
        </form>
      </div>

      {list && (
        <div className="card">
          <div className="packing-list-header">
            <h3>{'\u{1F4CB}'} Packing List for {list.destination}</h3>
            <span className="packing-progress">{checkedCount}/{totalItems} packed</span>
          </div>
          {totalItems > 0 && (
            <div className="packing-bar-track">
              <div className="packing-bar-fill" style={{ width: `${(checkedCount / totalItems) * 100}%` }} />
            </div>
          )}
          {Object.entries(list.categories).map(([category, items]) => (
            <div key={category} className="packing-category">
              <h4 className="packing-category-title" style={{ textTransform: "capitalize" }}>{category}</h4>
              <div className="packing-items">
                {items.map((item, i) => {
                  const key = `${category}-${i}`;
                  return (
                    <label key={key} className={`packing-item ${checked[key] ? "packed" : ""}`} onClick={() => toggleItem(key)}>
                      <span className="packing-checkbox-icon">{checked[key] ? "\u2611" : "\u2610"}</span>
                      <span className="packing-item-text">{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PackingList;
