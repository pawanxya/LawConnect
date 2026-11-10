import { useEffect, useRef, useState } from "react";

import { apiRequest } from "@/lib/apiClient";

const GOOGLE_SCRIPT_ID = "google-identity-services";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In script."));
    document.body.appendChild(script);
  });

const GoogleAuthButton = ({ text = "continue_with", onCredential, disabled = false }) => {
  const buttonRef = useRef(null);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || "");

  useEffect(() => {
    let cancelled = false;

    const renderGoogleButton = async () => {
      let resolvedClientId = clientId;

      if (!resolvedClientId || resolvedClientId.startsWith("REPLACE_")) {
        try {
          const response = await apiRequest("/auth/google-config");
          resolvedClientId = response.clientId || "";
          if (!cancelled) {
            setClientId(resolvedClientId);
          }
        } catch {
          resolvedClientId = "";
        }
      }

      if (!resolvedClientId || resolvedClientId.startsWith("REPLACE_")) {
        setError("Google Sign-In is not configured. Add GOOGLE_CLIENT_ID in the backend .env file.");
        return;
      }

      try {
        await loadGoogleScript();
        if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: resolvedClientId,
          callback: ({ credential }) => {
            if (credential && onCredential) {
              onCredential(credential);
            }
          },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text,
          width: buttonRef.current.offsetWidth || 320,
        });
      } catch (scriptError) {
        if (!cancelled) {
          setError(scriptError.message || "Unable to initialize Google Sign-In.");
        }
      }
    };

    renderGoogleButton();

    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, text]);

  if (disabled) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div ref={buttonRef} className="w-full flex justify-center" />
      {error ? <p className="text-xs text-muted-foreground text-center">{error}</p> : null}
    </div>
  );
};

export { GoogleAuthButton };
