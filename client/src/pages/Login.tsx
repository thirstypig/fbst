import React from "react";
import GoogleSignInButton from "../components/GoogleSignInButton";


export default function Login() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col md:flex-row">
      
      {/* Left / Top: Hero Section */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-16 bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-950 border-b md:border-b-0 md:border-r border-white/5">
        <div>
           <div className="flex items-center gap-3 mb-8">
             <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center">
               <span className="font-bold text-indigo-400">F</span>
             </div>
             <div className="text-xl font-bold tracking-tight">FBST</div>
           </div>

           <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
             Fantasy Baseball <br/> Stat Tool.
           </h1>
           
           <p className="text-lg text-slate-400 max-w-md leading-relaxed">
             Advanced auction tools, real-time draft rooms, and deep historical analytics for the modern fantasy baseball league.
           </p>
        </div>

        <div className="hidden md:block text-xs text-slate-600 mt-12">
           &copy; {new Date().getFullYear()} FBST Platform. All rights reserved.
        </div>
      </div>

      {/* Right / Bottom: Auth Section */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[url('/grid.svg')] bg-center bg-cover relative">
         <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-[1px]" />
         
         <div className="relative w-full max-w-sm">
            <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
                <p className="text-sm text-slate-400 mt-1">Sign in to access your leagues.</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center">
                  <GoogleSignInButton label="Continue with Google" />
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 text-center">
                <p className="text-sm text-slate-500 mb-3">Don't have an account?</p>
                <a 
                  href="mailto:commissioner@fbst.app?subject=Request%20Access%20to%20FBST"
                  className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Request Access &rarr;
                </a>
              </div>
            </div>

            <div className="mt-8 text-center md:hidden text-xs text-slate-600">
              &copy; {new Date().getFullYear()} FBST Platform. All rights reserved.
            </div>
         </div>
      </div>

    </div>
  );
}
