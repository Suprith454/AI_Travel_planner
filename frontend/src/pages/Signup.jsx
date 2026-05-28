import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { auth } from "../api";

function Signup() {
  const [step, setStep] = useState("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(true);
  const otpRefs = useRef([]);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const data = await auth.signup({ email, password });
      setEmailSent(data.email_sent !== false);
      setStep("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (val && !/^\d$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[i] = val;
    setOtp(newOtp);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the full 6-digit code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await auth.verifyOtp({ email, code, purpose: "signup" });
      login({ id: data.user_id, email: data.email });
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const data = await auth.resendOtp({ email, purpose: "signup" });
      setEmailSent(data.email_sent !== false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    const digits = text.replace(/\D/g, "").slice(0, 6);
    if (digits.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < digits.length; i++) newOtp[i] = digits[i];
      setOtp(newOtp);
      otpRefs.current[Math.min(digits.length, 5)]?.focus();
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">&#9992;</div>
          {step === "form" ? (
            <>
              <h2>Create Account</h2>
              <p className="auth-subtitle">Start planning your dream trips</p>
            </>
          ) : (
            <>
              <h2>Verify Email</h2>
              <p className="auth-subtitle">Enter the 6-digit code sent to {email}</p>
            </>
          )}
        </div>

        {step === "form" ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" required />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required />
            </div>
            {error && <p className="form-error">&#9888; {error}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
              {loading ? <span className="spinner spinner-sm" /> : "Create Account"}
            </button>
          </form>
        ) : (
          <div>
            <div className="otp-input-group" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="otp-input"
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {!emailSent && (
              <p className="form-hint" style={{ textAlign: "center", marginBottom: 12, color: "var(--warning)" }}>
                Failed to send email. Check your SMTP_USER / SMTP_PASS on the server.
              </p>
            )}
            {error && <p className="form-error" style={{ justifyContent: "center" }}>&#9888; {error}</p>}
            <button className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: 16 }} onClick={handleVerifyOtp}>
              {loading ? <span className="spinner spinner-sm" /> : "Verify & Continue"}
            </button>
            <p className="auth-footer" style={{ marginTop: 16 }}>
              Didn't get the code?{" "}
              <button className="btn btn-secondary btn-sm" onClick={handleResend} disabled={loading}>
                Resend
              </button>
            </p>
          </div>
        )}

        {step === "form" && (
          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default Signup;
