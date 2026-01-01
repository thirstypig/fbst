// client/src/components/GoogleSignInButton.tsx
import React from "react";
import { API_BASE } from "../api";

export default function GoogleSignInButton({ label = "Continue with Google" }: { label?: string }) {
  // API_BASE already ends with /api, so this becomes:
  // http://localhost:4000/api/auth/google (local)
  const href = `${API_BASE}/auth/google`;

  return (
    <a
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
    >
      <span className="font-medium">{label}</span>
    </a>
  );
}
