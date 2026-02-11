export const GoogleConfig = {
  get clientId() {
    return process.env.GOOGLE_CLIENT_ID || "";
  },
  get clientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET || "";
  },
  get redirectUri() {
    if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
    
    if (process.env.NODE_ENV === "development") {
      // Google requires HTTP for localhost
      return "http://localhost:5173/api/auth/google/callback";
    }
    
    // In production, fallback to trying to construct it (though env var is better)
    return ""; 
  },
  
  validate() {
    const missing = [];
    if (!this.clientId) missing.push("GOOGLE_CLIENT_ID");
    if (!this.clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
    
    // If we can't determine a redirect URI, that's a problem
    if (!this.redirectUri) missing.push("GOOGLE_REDIRECT_URI (or NODE_ENV=development)");
    
    if (missing.length > 0) {
      throw new Error(`Google Auth Config Missing: ${missing.join(", ")}`);
    }
  }
};
