import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../api";
import BackgroundSlideshow from "../components/BackgroundSlideshow";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.forgotPassword({ email, purpose: "reset" });
      setSent(true);
      setTimeout(() => navigate(`/reset-password?email=${encodeURIComponent(email)}`), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundSlideshow>
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">&#9992;</div>
          <h2>Forgot Password</h2>
          <p className="auth-subtitle">
            {sent ? "Check your email for the reset code" : "Enter your email to receive a reset code"}
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "var(--accent-light)", color: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, margin: "0 auto 16px",
              }}
            >&#10003;</div>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 20 }}>
              Redirecting to reset page...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
            </div>
            {error && <p className="form-error">&#9888; {error}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
              {loading ? <span className="spinner spinner-sm" /> : "Send Reset Code"}
            </button>
          </form>
        )}

        <p className="auth-footer">
          Remember your password? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </BackgroundSlideshow>
  );
}

export default ForgotPassword;
