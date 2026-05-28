import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { chat } from "../api";
import TripPreview from "../components/TripPreview";

const EXAMPLES = [
  "Plan a 5-day trip to Goa under ₹20,000 with adventure activities",
  "Plan a 3-day trip to Paris for a couple, budget €1000, love food and art",
  "Plan a week-long family trip to Bangkok with kids, budget-friendly",
  "Plan a 2-day solo trip to Manali for ₹10,000, adventure and nature",
];

function Chat() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "🌍 Where would you like to travel? Tell me your destination, how many days, your budget, and what you're interested in!" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const data = await chat.plan(msg, user.id);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.reply, trip: data.trip },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Sorry, I couldn't plan that trip. Try rephrasing or check your connection." },
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

  return (
    <div className="chat-page">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            <div className="chat-avatar">
              {msg.role === "bot" ? "🤖" : "🧑"}
            </div>
            <div className="chat-bubble">
              <div className="chat-text">{renderText(msg.text)}</div>
              {msg.trip && <TripPreview trip={msg.trip} onView={() => navigate(`/trips/${msg.trip.id}`)} />}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg bot">
            <div className="chat-avatar">🤖</div>
            <div className="chat-bubble">
              <div className="chat-typing">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
              </div>
            </div>
          </div>
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
          placeholder="Describe your dream trip..."
          rows={1}
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {loading ? <span className="spinner spinner-sm" /> : "➤"}
        </button>
      </div>
    </div>
  );
}

function renderText(text) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**")) {
      return <p key={i} className="chat-bold">{line.replace(/\*\*/g, "")}</p>;
    }
    const rendered = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
    return <p key={i} dangerouslySetInnerHTML={{ __html: rendered }} />;
  });
}

export default Chat;
