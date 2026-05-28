import { useState, useRef, useEffect } from "react";
import { chat } from "../api";

export default function AskAI({ tripId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, text: m.text }));
      const data = await chat.ask(tripId, q, history);
      setMessages((prev) => [...prev, { role: "bot", text: data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Sorry, I couldn't process that. Please try again." }]);
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
    <>
      <button className="ask-ai-fab" onClick={() => setOpen((v) => !v)} title="Ask AI about your trip">
        <span className="ask-ai-fab-icon">{open ? "\u2715" : "\uD83E\uDD16"}</span>
      </button>

      {open && (
        <div className="ask-ai-panel">
          <div className="ask-ai-header">
            <span>AI Trip Assistant</span>
            <button className="ask-ai-close" onClick={() => setOpen(false)}>&times;</button>
          </div>
          <div className="ask-ai-messages">
            {messages.length === 0 && (
              <div className="ask-ai-welcome">
                <p>Ask anything about your trip! For example:</p>
                <ul>
                  <li>What time does day 1 start?</li>
                  <li>Suggest a shorter alternative for lunch on day 2</li>
                  <li>How much is the total trip budget?</li>
                  <li>What can I do if I am over budget on day 3?</li>
                </ul>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ask-ai-msg ${m.role}`}>
                <div className="ask-ai-bubble">{m.text}</div>
              </div>
            ))}
            {loading && (
              <div className="ask-ai-msg bot">
                <div className="ask-ai-bubble">
                  <div className="chat-typing">
                    <div className="chat-typing-dot" />
                    <div className="chat-typing-dot" />
                    <div className="chat-typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="ask-ai-input-bar">
            <input
              className="ask-ai-input"
              placeholder="Ask about your trip..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button className="ask-ai-send" onClick={handleSend} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
