import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import PlanTrip from "./pages/PlanTrip";
import TripView from "./pages/TripView";
import "./App.css";

function App() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
          <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/plan" element={user ? <PlanTrip /> : <Navigate to="/login" />} />
          <Route path="/trips/:id" element={user ? <TripView /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
