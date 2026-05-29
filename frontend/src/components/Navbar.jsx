import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-brand-icon">&#9992;</span>
        AI Travel Planner
      </Link>
      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/" className={location.pathname === "/" ? "active" : ""}>My Trips</Link>
            <Link to="/chat" className={location.pathname === "/chat" ? "active" : ""}>AI Chat</Link>
            <Link to="/plan" className={location.pathname === "/plan" ? "active" : ""}>Plan Trip</Link>
            <Link to="/budget" className={location.pathname === "/budget" ? "active" : ""}>Budget</Link>
            <Link to="/getaways" className={location.pathname === "/getaways" ? "active" : ""}>Getaways</Link>
            <Link to="/tools" className={location.pathname === "/tools" ? "active" : ""}>Tools</Link>
            <div className="navbar-user">
              <span className="navbar-user-email">{user.name || user.email}</span>
              <span className="navbar-avatar">{(user.name || user.email)?.charAt(0).toUpperCase()}</span>
              <button className="btn btn-outline btn-sm btn-logout" onClick={() => { logout(); navigate("/login"); }}>
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
