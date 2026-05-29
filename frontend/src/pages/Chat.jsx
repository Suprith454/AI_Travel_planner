import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { marked } from "marked";
import { useAuth } from "../AuthContext";
import { chat } from "../api";
import TripPreview from "../components/TripPreview";

const EXAMPLES = [
  "Plan a trip to Goa",
  "I want to visit Paris",
  "Plan a 5-day trip to Manali under ₹20,000",
  "What trips do I have?",
];

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const supportsVoice = !!SpeechRecognition;

function Chat() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Where would you like to travel? Just tell me a destination and I'll help plan your trip!", time: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleMic = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    if (listening) stopListening();
    setInput("");

    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text: msg, time: new Date() }]);
    setLoading(true);

    try {
      const data = await chat.plan(msg, user.id, history);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.reply, trip: data.trip || null, time: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Sorry, I couldn't process that. Please try again.", time: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  return (
    <div className="chat-page">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            className={`chat-msg ${msg.role}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {msg.role === "bot" ? botAvatar : userAvatar}
            <div className="chat-bubble">
              {renderMarkdown(msg.text)}
              {msg.time && <div className="chat-time">{formatTime(msg.time)}</div>}
              {msg.trip && <TripPreview trip={msg.trip} onView={() => navigate(`/trips/${msg.trip.id}`)} />}
            </div>
          </motion.div>
        ))}

        {loading && (
          <motion.div
            className="chat-msg bot"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {botAvatar}
            <div className="chat-bubble">
              <div className="chat-typing">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
              </div>
            </div>
          </motion.div>
        )}

        {messages.length === 1 && (
          <div className="chat-examples">
            <p className="chat-examples-label">Try asking:</p>
            <div className="chat-examples-grid">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  className="chat-example-btn"
                  onClick={() => { setInput(ex); inputRef.current?.focus(); }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={listening ? "Listening..." : "Describe your dream trip..."}
          rows={1}
          disabled={loading}
        />
        {supportsVoice && (
          <button
            className={`chat-mic-btn ${listening ? "recording" : ""}`}
            onClick={toggleMic}
            disabled={loading}
            title={listening ? "Stop recording" : "Start voice input"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </button>
        )}
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {loading ? (
            <span className="spinner spinner-sm" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default Chat;
