import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { marked } from "marked";
import { useAuth } from "../AuthContext";
import { trips, chat, tools } from "../api";
import { useToast } from "../components/Toast";
import TripPreview from "../components/TripPreview";

const QUICK_DESTINATIONS = [
  { name: "Paris", desc: "City of Light & Love", emoji: "\u{1F30D}" },
  { name: "Tokyo", desc: "Tradition meets Future", emoji: "\u{1F5FC}" },
  { name: "Goa", desc: "Beaches & Nightlife", emoji: "\u{1F3D6}" },
  { name: "Manali", desc: "Mountain Adventure", emoji: "\u{1F3D4}" },
];

const EXAMPLES = [
  "Plan a trip to Goa",
  "I want to visit Paris",
  "Plan a 5-day trip to Manali under \u20B920,000",
  "What trips do I have?",
];

const TIERS = [
  { value: "budget", label: "Budget", icon: "\u{1F4B0}", desc: "$50-100/day" },
  { value: "mid", label: "Mid", icon: "\u{1F4B5}", desc: "$150-250/day" },
  { value: "luxury", label: "Luxury", icon: "\u{1F48E}", desc: "$350-500/day" },
];

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const supportsVoice = !!SpeechRecognition;

function PlanTrip() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  // Tab state
  const [tab, setTab] = useState("form");

  // Form state
  const [form, setForm] = useState({
    destination: "", start_date: "", end_date: "",
    budget: "", travelers: "", interests: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Chat state
  const [messages, setMessages] = useState([
    { role: "bot", text: "Where would you like to travel? Just tell me a destination and I'll help plan your trip!", time: new Date() },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Budget state
  const [showBudget, setShowBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ destination: "", days: "", travelers: "1", budget: "", tier: "mid" });
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [multiTier, setMultiTier] = useState(null);

  const botAvatar = useMemo(() => (
    <div className="chat-avatar" style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-hover))", border: "none" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M2 18v2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4v-2"/><path d="M6 14h.01M18 14h.01M10 18h4"/></svg>
    </div>
  ), []);

  const userAvatar = useMemo(() => (
    <div className="chat-avatar" style={{ background: "var(--surface-secondary)" }}>
      <span style={{ fontSize: 14 }}>{(user?.name || user?.email || "U")?.charAt(0).toUpperCase()}</span>
    </div>
  ), [user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, [chatLoading]);
  useEffect(() => { return () => { if (recognitionRef.current) recognitionRef.current.abort(); }; }, []);

  // Form handlers
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleQuickSelect = (name) => setForm({ ...form, destination: name });

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.destination.trim()) return;
    setFormLoading(true);
    setFormError("");
    try {
      const trip = await trips.generate(form, user.id);
      addToast("Trip generated successfully!", "success");
      navigate(`/trips/${trip.id}`);
    } catch (err) {
      setFormError(err.message);
      addToast(err.message || "Failed to generate trip", "error");
    } finally {
      setFormLoading(false);
    }
  };

  // Chat handlers
  const startListening = () => {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++)
        transcript += event.results[i][0].transcript;
      setChatInput(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setListening(false);
  };

  const toggleMic = () => { listening ? stopListening() : startListening(); };

  const handleChatSend = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    if (listening) stopListening();
    setChatInput("");
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text: msg, time: new Date() }]);
    setChatLoading(true);
    try {
      const data = await chat.plan(msg, user.id, history);
      setMessages((prev) => [...prev, { role: "bot", text: data.reply, trip: data.trip || null, time: new Date() }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Sorry, I couldn't process that. Please try again.", time: new Date() }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } };

  // Budget handlers
  const handleBudgetChange = (e) => setBudgetForm({ ...budgetForm, [e.target.name]: e.target.value });

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();
    if (!budgetForm.destination.trim() || !budgetForm.days) {
      addToast("Destination and days required", "error");
      return;
    }
    setBudgetLoading(true);
    try {
      const [a, m] = await Promise.all([
        tools.budgetAnalyze(budgetForm.destination, parseInt(budgetForm.days), parseInt(budgetForm.travelers), budgetForm.budget ? parseFloat(budgetForm.budget) : null, budgetForm.tier),
        tools.multiTier(budgetForm.destination, parseInt(budgetForm.days), parseInt(budgetForm.travelers)),
      ]);
      setAnalysis(a);
      setMultiTier(m);
    } catch (err) {
      addToast("Failed to analyze budget: " + err.message, "error");
    } finally {
      setBudgetLoading(false);
    }
  };

  const formatTime = (d) => {
    if (!d) return "";
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMarkdown = (text) => {
    const html = marked.parse(text, { breaks: true, gfm: true });
    return <div className="chat-text" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const gaugeDegree = analysis?.feasibility_score != null ? (analysis.feasibility_score / 100) * 180 : 0;
  const gaugeColor = analysis?.feasibility_score >= 80 ? "var(--primary)" : analysis?.feasibility_score >= 50 ? "var(--warning)" : "var(--danger)";

  const destFromForm = form.destination || budgetForm.destination || (messages.find(m => m.trip)?.trip?.destination) || "";

  return (
    <div className="main-content">
      <button className="back-btn" onClick={() => navigate("/")}>&larr; Dashboard</button>

      <motion.div className="dashboard-hero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="dashboard-hero-content">
          <h1 className="dashboard-hero-title">
            Where to next, <span className="text-primary">{user?.name?.split(" ")[0] || "Traveler"}</span>?
          </h1>
          <p className="dashboard-hero-subtitle">Tell us your destination and we'll craft the perfect itinerary</p>
          <div className="dashboard-hero-quick">
            {QUICK_DESTINATIONS.map((d) => (
              <button key={d.name} className={`dashboard-quick-btn ${form.destination === d.name ? "selected" : ""}`} onClick={() => { handleQuickSelect(d.name); setTab("form"); }}>
                <span>{d.emoji}</span>
                <div>
                  <div className="dashboard-quick-name">{d.name}</div>
                  <div className="dashboard-quick-desc">{d.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="plan-tabs">
        <button className={`plan-tab ${tab === "form" ? "active" : ""}`} onClick={() => setTab("form")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Quick Form
        </button>
        <button className={`plan-tab ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/></svg>
          AI Chat
        </button>
      </div>

      {tab === "form" && (
        <div className="plan-form-card">
          <div className="plan-form-header">
            <div className="plan-form-icon">{'\u{1F9D1}\u200D\u{1F4BB}'}</div>
            <div>
              <div className="plan-form-title">Plan Your Trip</div>
              <div className="plan-form-subtitle">Fill in the details and let AI create your perfect itinerary</div>
            </div>
          </div>
          <form onSubmit={handleFormSubmit} className="plan-form-dividers">
            <div className="form-group">
              <label>Destination</label>
              <input name="destination" value={form.destination} onChange={handleChange} placeholder="e.g., Paris, France, Tokyo, Goa..." required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" name="start_date" value={form.start_date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" name="end_date" value={form.end_date} onChange={handleChange} min={form.start_date || undefined} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Budget</label>
                <input name="budget" value={form.budget} onChange={handleChange} placeholder="e.g., $1000 or Budget/Mid/Luxury" />
              </div>
              <div className="form-group">
                <label>Travelers</label>
                <input name="travelers" value={form.travelers} onChange={handleChange} placeholder="e.g., 2" type="number" min="1" />
              </div>
            </div>
            <div className="form-group">
              <label>Interests</label>
              <textarea name="interests" value={form.interests} onChange={handleChange} placeholder="e.g., food, history, adventure, nature, museums, shopping" rows={2} />
              <p className="form-hint">Optional — separate with commas. Our AI will tailor activities to your preferences.</p>
            </div>
            {formError && <p className="form-error">{formError}</p>}
            <button type="submit" className="plan-form-btn" disabled={formLoading || !form.destination.trim()}>
              {formLoading ? <><span className="spinner spinner-sm" /> Generating with AI...</> : <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Generate Itinerary
              </>}
            </button>
          </form>
        </div>
      )}

      {tab === "chat" && (
        <div className="chat-embedded-card">
          <div className="chat-embedded-messages">
            {messages.map((msg, i) => (
              <motion.div key={i} className={`chat-msg ${msg.role}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {msg.role === "bot" ? botAvatar : userAvatar}
                <div className="chat-bubble">
                  {renderMarkdown(msg.text)}
                  {msg.time && <div className="chat-time">{formatTime(msg.time)}</div>}
                  {msg.trip && <TripPreview trip={msg.trip} onView={() => navigate(`/trips/${msg.trip.id}`)} />}
                </div>
              </motion.div>
            ))}
            {chatLoading && (
              <motion.div className="chat-msg bot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {botAvatar}
                <div className="chat-bubble">
                  <div className="chat-typing"><span className="chat-typing-dot" /><span className="chat-typing-dot" /><span className="chat-typing-dot" /></div>
                </div>
              </motion.div>
            )}
            {messages.length === 1 && (
              <div className="chat-examples">
                <p className="chat-examples-label">Try asking:</p>
                <div className="chat-examples-grid">
                  {EXAMPLES.map((ex, i) => (
                    <button key={i} className="chat-example-btn" onClick={() => { setChatInput(ex); inputRef.current?.focus(); }}>{ex}</button>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-embedded-input-bar">
            <textarea ref={inputRef} className="chat-input" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleChatKey} placeholder={listening ? "Listening..." : "Describe your dream trip..."} rows={1} disabled={chatLoading} />
            {supportsVoice && (
              <button className={`chat-mic-btn ${listening ? "recording" : ""}`} onClick={toggleMic} disabled={chatLoading} title={listening ? "Stop recording" : "Start voice input"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
            )}
            <button className="chat-send-btn" onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()}>
              {chatLoading ? <span className="spinner spinner-sm" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} /> : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="plan-budget-section">
        <button className="plan-budget-toggle" onClick={() => setShowBudget(!showBudget)}>
          <span>{'\u{1F4CA}'} Budget Analyzer</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showBudget ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {showBudget && (
          <div className="plan-budget-content">
            <form onSubmit={handleBudgetSubmit} className="budget-inline-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Destination</label>
                  <input name="destination" value={budgetForm.destination} onChange={handleBudgetChange} placeholder={destFromForm || "e.g. Paris"} />
                </div>
                <div className="form-group">
                  <label>Days</label>
                  <input name="days" type="number" min="1" value={budgetForm.days} onChange={handleBudgetChange} placeholder="5" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Travelers</label>
                  <input name="travelers" type="number" min="1" value={budgetForm.travelers} onChange={handleBudgetChange} />
                </div>
                <div className="form-group">
                  <label>Budget (USD, optional)</label>
                  <input name="budget" type="number" min="0" value={budgetForm.budget} onChange={handleBudgetChange} placeholder="For feasibility check" />
                </div>
              </div>
              <div className="form-group">
                <label>Tier</label>
                <div className="tier-selector">
                  {TIERS.map((t) => (
                    <button key={t.value} type="button" className={`tier-option ${budgetForm.tier === t.value ? "active" : ""}`} onClick={() => setBudgetForm({ ...budgetForm, tier: t.value })}>
                      <span className="tier-option-icon">{t.icon}</span>
                      <span className="tier-option-label">{t.label}</span>
                      <span className="tier-option-desc">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-secondary" style={{ width: "100%" }} disabled={budgetLoading}>
                {budgetLoading ? <span className="spinner spinner-sm" /> : "\u{1F50D}"} Analyze Budget
              </button>
            </form>

            {analysis && (
              <div className="budget-inline-results">
                <div className="budget-inline-feasibility">
                  {analysis.feasibility_score != null ? (
                    <div className="feasibility-gauge-wrap" style={{ margin: "16px 0" }}>
                      <div className="feasibility-gauge">
                        <div className="feasibility-gauge-bg" />
                        <div className="feasibility-gauge-fill" style={{ transform: `rotate(${gaugeDegree}deg)`, background: gaugeColor }} />
                        <div className="feasibility-gauge-center">
                          <span className="feasibility-score" style={{ color: gaugeColor }}>{analysis.feasibility_score}%</span>
                          <span className="feasibility-label">Feasible</span>
                        </div>
                      </div>
                    </div>
                  ) : <p className="text-muted" style={{ textAlign: "center", padding: 12 }}>Set a budget to see feasibility</p>}
                  <div className="feasibility-totals">
                    <div className="feasibility-total-item"><span className="feasibility-total-label">Per Person / Day</span><span className="feasibility-total-value">${analysis.per_person_daily}</span></div>
                    <div className="feasibility-total-item"><span className="feasibility-total-label">Total Per Person</span><span className="feasibility-total-value">${analysis.total_per_person}</span></div>
                    <div className="feasibility-total-item"><span className="feasibility-total-label">Total Trip Cost</span><span className="feasibility-total-value" style={{ color: analysis.over_budget ? "var(--danger)" : "var(--primary)" }}>${analysis.total_trip_cost}</span></div>
                  </div>
                  {analysis.recommendation && <div className={`feasibility-recommendation ${analysis.over_budget ? "over-budget" : "on-budget"}`} style={{ marginTop: 12 }}>{analysis.over_budget ? "\u26A0\uFE0F" : "\u2705"} {analysis.recommendation}</div>}
                </div>

                <div className="budget-inline-breakdown">
                  <h4>Category Breakdown</h4>
                  {Object.entries(analysis.breakdown).map(([cat, data]) => {
                    const pct = analysis.total_trip_cost > 0 ? Math.round((data.total / analysis.total_trip_cost) * 100) : 0;
                    return (
                      <div key={cat} className="analyzer-breakdown-row" style={{ marginBottom: 10 }}>
                        <div className="analyzer-breakdown-header">
                          <span className="analyzer-breakdown-name" style={{ textTransform: "capitalize" }}>{cat}</span>
                          <span className="analyzer-breakdown-cost">{analysis.currency}{data.daily}/day &middot; {analysis.currency}{data.total} total</span>
                        </div>
                        <div className="budget-bar-track" style={{ height: 6 }}><div className="budget-bar-fill" style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>

                <div className="budget-inline-multi">
                  <h4>Multi-Tier Comparison</h4>
                  <div className="multi-tier-grid">
                    {multiTier && Object.entries(multiTier.tiers).map(([tier, data]) => (
                      <div key={tier} className={`multi-tier-card ${tier}`}>
                        <div className="multi-tier-header">
                          <span className="multi-tier-icon">{TIERS.find((t) => t.value === tier)?.icon}</span>
                          <span className="multi-tier-label" style={{ textTransform: "capitalize" }}>{tier}</span>
                        </div>
                        <div className="multi-tier-total">{multiTier.currency}{data.total_cost}</div>
                        <div className="multi-tier-daily">{multiTier.currency}{data.daily_per_person}/day</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlanTrip;
