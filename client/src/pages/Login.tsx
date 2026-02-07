import React from "react";
import GoogleSignInButton from "../components/GoogleSignInButton";


export default function Login() {
  return (
    <div className="lg-auth-container">
      
      {/* Left / Top: Hero Section */}
      <div className="lg-auth-hero">
        <div>
           <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
               <span className="font-bold text-white text-lg">F</span>
             </div>
             <div className="text-xl font-bold tracking-tight text-white">FBST</div>
           </div>

           <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 text-white leading-tight">
             Fantasy Baseball <br/> Stat Tool.
           </h1>
           
           <p className="text-lg text-white/70 max-w-md leading-relaxed">
             Advanced auction tools, real-time draft rooms, and deep historical analytics for the modern fantasy baseball league.
           </p>
        </div>

        <div className="hidden md:block text-xs text-white/40 mt-12">
           &copy; {new Date().getFullYear()} FBST Platform. All rights reserved.
        </div>
      </div>

      {/* Right / Bottom: Auth Section */}
      <div className="lg-auth-form-area">
         <div className="lg-auth-form-card">
           <div className="mb-8">
             <h2 className="lg-heading-2 mb-2">Welcome back</h2>
             <p className="text-sm text-[var(--lg-text-muted)]">Sign in to access your leagues.</p>
           </div>

           <div className="space-y-4">
             <div className="flex justify-center">
               <GoogleSignInButton label="Continue with Google" />
             </div>
           </div>

           <div className="mt-8 pt-8 border-t border-[var(--lg-glass-border)] text-center">
             <p className="text-sm text-[var(--lg-text-muted)] mb-3">Don't have an account?</p>
             <a 
               href="mailto:commissioner@fbst.app?subject=Request%20Access%20to%20FBST"
               className="text-sm font-semibold text-[var(--lg-accent)] hover:text-[var(--lg-accent-hover)] transition-colors"
             >
               Request Access &rarr;
             </a>
           </div>
         </div>

         <div className="mt-8 text-center md:hidden text-xs text-[var(--lg-text-muted)]">
           &copy; {new Date().getFullYear()} FBST Platform. All rights reserved.
         </div>
      </div>

    </div>
  );
}
