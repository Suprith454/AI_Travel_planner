import { useRef, useEffect } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GoogleLoginButton({ onSuccess, onError, label = "Continue with Google" }) {
  const btnRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!CLIENT_ID || !window.google?.accounts) return;

    const id = window.google.accounts.id;
    id.initialize({
      client_id: CLIENT_ID,
      callback: (response) => {
        if (!mountedRef.current) return;
        if (response.credential) {
          onSuccess(response.credential);
        } else {
          onError?.(new Error("No credential returned"));
        }
      },
      auto_select: false,
      cancel_on_tap_outside: false,
    });

    if (btnRef.current) {
      id.renderButton(btnRef.current, {
        type: "standard",
        shape: "rectangular",
        theme: "outline",
        size: "large",
        text: label === "Continue with Google" ? "continue_with" : "signin_with",
        width: btnRef.current.offsetWidth || 340,
        logo_alignment: "center",
      });
    }
  }, [onSuccess, onError, label]);

  if (!CLIENT_ID) {
    return (
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
        Google sign-in not configured (set VITE_GOOGLE_CLIENT_ID)
      </p>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <div ref={btnRef} />
    </div>
  );
}

export default GoogleLoginButton;
