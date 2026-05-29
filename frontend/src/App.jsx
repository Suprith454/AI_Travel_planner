import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ToastProvider } from "./components/Toast";
import ScrollToTop from "./components/ScrollToTop";
import Navbar from "./components/Navbar";
import SharedTripView from "./pages/SharedTripView";
import "./App.css";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PlanTrip = lazy(() => import("./pages/PlanTrip"));
const TripView = lazy(() => import("./pages/TripView"));
const Chat = lazy(() => import("./pages/Chat"));

function Lazy({ children }) {
  return <Suspense fallback={<div className="loading-page"><div className="spinner" /><p className="loading-text">Loading...</p></div>}>{children}</Suspense>;
}

function App() {
  const { user } = useAuth();

  return (
    <ToastProvider>
      <ScrollToTop />
      <Navbar />
      <div className="page-enter">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Lazy><Login /></Lazy>} />
          <Route path="/signup" element={user ? <Navigate to="/" /> : <Lazy><Signup /></Lazy>} />
          <Route path="/shared/:token" element={<Lazy><SharedTripView /></Lazy>} />
          <Route path="/" element={user ? <Lazy><Dashboard /></Lazy> : <Navigate to="/login" />} />
          <Route path="/chat" element={user ? <Lazy><Chat /></Lazy> : <Navigate to="/login" />} />
          <Route path="/plan" element={user ? <Lazy><PlanTrip /></Lazy> : <Navigate to="/login" />} />
          <Route path="/trips/:id" element={user ? <Lazy><TripView /></Lazy> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </ToastProvider>
  );
}

export default App;
