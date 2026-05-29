import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "./AuthContext";
import { ToastProvider } from "./components/Toast";
import Navbar from "./components/Navbar";
import SharedTripView from "./pages/SharedTripView";
import "./App.css";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PlanTrip = lazy(() => import("./pages/PlanTrip"));
const TripView = lazy(() => import("./pages/TripView"));
const Chat = lazy(() => import("./pages/Chat"));
const BudgetAnalyzer = lazy(() => import("./pages/BudgetAnalyzer"));
const GetawayFinder = lazy(() => import("./pages/GetawayFinder"));
const ToolsHub = lazy(() => import("./pages/ToolsHub"));

function Lazy({ children }) {
  return <Suspense fallback={<div className="loading-page"><div className="spinner" /><p className="loading-text">Loading...</p></div>}>{children}</Suspense>;
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: "easeIn" } },
};

function AnimatedPage({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

function App() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <ToastProvider>
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Lazy><AnimatedPage><Login /></AnimatedPage></Lazy>} />
          <Route path="/signup" element={user ? <Navigate to="/" /> : <Lazy><AnimatedPage><Signup /></AnimatedPage></Lazy>} />
          <Route path="/shared/:token" element={<Lazy><AnimatedPage><SharedTripView /></AnimatedPage></Lazy>} />
          <Route path="/" element={user ? <Lazy><AnimatedPage><Dashboard /></AnimatedPage></Lazy> : <Navigate to="/login" />} />
          <Route path="/chat" element={user ? <Lazy><AnimatedPage><Chat /></AnimatedPage></Lazy> : <Navigate to="/login" />} />
          <Route path="/plan" element={user ? <Lazy><AnimatedPage><PlanTrip /></AnimatedPage></Lazy> : <Navigate to="/login" />} />
          <Route path="/trips/:id" element={user ? <Lazy><AnimatedPage><TripView /></AnimatedPage></Lazy> : <Navigate to="/login" />} />
          <Route path="/budget" element={user ? <Lazy><AnimatedPage><BudgetAnalyzer /></AnimatedPage></Lazy> : <Navigate to="/login" />} />
          <Route path="/getaways" element={user ? <Lazy><AnimatedPage><GetawayFinder /></AnimatedPage></Lazy> : <Navigate to="/login" />} />
          <Route path="/tools" element={user ? <Lazy><AnimatedPage><ToolsHub /></AnimatedPage></Lazy> : <Navigate to="/login" />} />
        </Routes>
      </AnimatePresence>
    </ToastProvider>
  );
}

export default App;
