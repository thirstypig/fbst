import React from "react";
import GoogleSignInButton from "../components/GoogleSignInButton";

export default function Login() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/70 p-8 shadow-xl text-center">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">Use Google to access FBST.</p>
        <div className="mt-6 flex justify-center">
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
