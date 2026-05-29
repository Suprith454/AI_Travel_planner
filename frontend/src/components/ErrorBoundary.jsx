import { Component } from "react";

const CHUNK_ERROR_PATTERNS = [
  /Loading chunk \d+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Loading CSS chunk .* failed/i,
  /Importing a module script failed/i,
  /ChunkLoadError/i,
];

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const msg = error?.message || "";
    if (CHUNK_ERROR_PATTERNS.some((rx) => rx.test(msg))) {
      const lastReload = sessionStorage.getItem("chunk-error-reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem("chunk-error-reload", now.toString());
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#0f172a",
          color: "#e2e8f0",
          padding: 24,
          fontFamily: "Inter, sans-serif",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#9888;</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#94a3b8", marginBottom: 24, maxWidth: 400, fontSize: 14, lineHeight: 1.5 }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Refresh Page
            </button>
            <button
              onClick={this.handleReset}
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#e2e8f0",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Try Again
            </button>
          </div>
          {this.props.showDetails && (
            <pre style={{ marginTop: 24, color: "#f87171", fontSize: 12, maxWidth: "100%", overflow: "auto" }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
