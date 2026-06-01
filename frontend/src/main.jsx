import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import App from "./App.jsx";

const CHUNK_ERROR_PATTERNS = [
  /Loading chunk \d+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Loading CSS chunk .* failed/i,
  /Importing a module script failed/i,
  /ChunkLoadError/i,
];

let chunkReloaded = false;
window.addEventListener("error", (e) => {
  if (chunkReloaded) return;
  const msg = e?.message || "";
  if (CHUNK_ERROR_PATTERNS.some((rx) => rx.test(msg))) {
    chunkReloaded = true;
    const url = new URL(window.location.href);
    url.searchParams.set("_r", String(Date.now()));
    window.location.replace(url.toString());
  }
});

window.addEventListener("unhandledrejection", (e) => {
  if (chunkReloaded) return;
  const msg = e?.reason?.message || "";
  if (CHUNK_ERROR_PATTERNS.some((rx) => rx.test(msg))) {
    chunkReloaded = true;
    const url = new URL(window.location.href);
    url.searchParams.set("_r", String(Date.now()));
    window.location.replace(url.toString());
  }
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
