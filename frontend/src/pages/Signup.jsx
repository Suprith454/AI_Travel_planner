import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { auth } from "../api";
import BackgroundSlideshow from "../components/BackgroundSlideshow";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(val)) setName(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const data = await auth.signup({ name: name.trim(), email, password });
      login({ id: data.user_id, email: data.email, name: data.name });
      navigate("/");
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
          <h2>Create Account</h2>
          <p className="auth-subtitle">Start planning your dream trips</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input type="text" value={name} onChange={(e) => { const val = e.target.value; if (/^[a-zA-Z\s]*$/.test(val)) setName(val); }} placeholder="Your full name" required />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" required />
          </div>
          <div className="form-group">
            <label>Confirm Password *</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required />
          </div>
          {error && <p className="form-error">&#9888; {error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? <span className="spinner spinner-sm" /> : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </BackgroundSlideshow>
  );
}

export default Signup;
