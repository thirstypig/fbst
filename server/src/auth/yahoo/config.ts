export const YahooConfig = {
  get clientId() {
    return process.env.YAHOO_CLIENT_ID || "";
  },
  get clientSecret() {
    return process.env.YAHOO_CLIENT_SECRET || "";
  },
  get redirectUri() {
    if (process.env.YAHOO_REDIRECT_URI) return process.env.YAHOO_REDIRECT_URI;
    
    if (process.env.NODE_ENV === "development") {
      // Yahoo requires HTTPS for localhost
      return "https://localhost:4000/api/auth/yahoo/callback";
    }
    
    return "";
  },
  
  validate() {
    const missing = [];
    if (!this.clientId) missing.push("YAHOO_CLIENT_ID");
    if (!this.clientSecret) missing.push("YAHOO_CLIENT_SECRET");
    
    if (!this.redirectUri) missing.push("YAHOO_REDIRECT_URI (or NODE_ENV=development)");
    
    if (missing.length > 0) {
      throw new Error(`Yahoo Auth Config Missing: ${missing.join(", ")}`);
    }
  }
};
