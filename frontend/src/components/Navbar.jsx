import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useTheme } from "../ThemeContext";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-brand-icon">&#9992;</span>
        <span className="navbar-brand-text">AI Travel Planner</span>
      </Link>
      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/" className={location.pathname === "/" ? "active" : ""}>My Trips</Link>
            <Link to="/plan" className={location.pathname === "/plan" || location.pathname.startsWith("/plan") ? "active" : ""}>Plan Trip</Link>
            <Link to="/getaways" className={location.pathname === "/getaways" ? "active" : ""}>Getaways</Link>
            <Link to="/tools" className={location.pathname === "/tools" ? "active" : ""}>Travel Kit</Link>
            <button className="theme-toggle" onClick={toggle} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} aria-label="Toggle theme">
              <span className="theme-toggle-icon">{theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}"}</span>
            </button>
            <div className="navbar-user">
              <span className="navbar-user-email">{user.name || user.email}</span>
              <span className="navbar-avatar">{(user.name || user.email)?.charAt(0).toUpperCase()}</span>
              <button className="btn btn-outline btn-sm" onClick={() => { logout(); navigate("/login"); }}>
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className={location.pathname === "/login" ? "active" : ""}>Login</Link>
            <Link to="/signup" className={location.pathname === "/signup" ? "active" : ""}>Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
