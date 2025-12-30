// client/src/components/GoogleSignInButton.tsx
import React from "react";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000/api";

export default function GoogleSignInButton() {
  const href = `${API_BASE}/auth/google`;

  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/90 hover:bg-white/10"
    >
      Sign in with Google
    </a>
  );
}
