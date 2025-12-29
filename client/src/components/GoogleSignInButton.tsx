// client/src/components/GoogleSignInButton.tsx
import React, { useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthProvider";

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }

    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Sign-In script"));
    document.head.appendChild(s);
  });
}

export default function GoogleSignInButton() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { loginWithGoogleCredential } = useAuth();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error("Missing VITE_GOOGLE_CLIENT_ID");
        return;
      }

      await loadGoogleScript();
      if (!mounted) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: any) => {
          try {
            await loginWithGoogleCredential(String(resp?.credential ?? ""));
          } catch (e: any) {
            console.error(e?.message || "Sign-in failed");
          }
        },
      });

      if (ref.current) {
        window.google.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "signin_with",
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loginWithGoogleCredential]);

  return <div ref={ref} />;
}
