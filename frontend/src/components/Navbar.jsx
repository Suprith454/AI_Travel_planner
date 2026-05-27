import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <nav>
      <Link to="/" style={{ textDecoration: "none" }}>
        <h1>AI Travel Planner</h1>
      </Link>
      <div>
        {user ? (
          <>
            <Link to="/plan">Plan Trip</Link>
            <Link to="/">My Trips</Link>
            <span style={{ fontSize: 13, color: "#888" }}>{user.email}</span>
            <button onClick={() => { logout(); navigate("/login"); }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Signup</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
