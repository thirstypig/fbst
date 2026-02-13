import { createClient } from "@supabase/supabase-js";

// Force fallback if env var is empty string
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = (envUrl && envUrl.length > 0) ? envUrl : "https://chiezqfroxjknjasxcjq.supabase.co";
const supabaseAnonKey = (envKey && envKey.length > 0) ? envKey : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoaWV6cWZyb3hqa25qYXN4Y2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDgxMDQsImV4cCI6MjA4NjQyNDEwNH0.ncVCN2uKu0B43f5TFqlQqNRlFHB47DnheRN5dQFAb-8";

console.log("🛠️ Supabase Init Debug:");
console.log("  - VITE_SUPABASE_URL (Raw):", envUrl);
console.log("  - Final URL:", supabaseUrl);
console.log("  - Final Key Length:", supabaseAnonKey?.length);

if (!supabaseUrl) {
  console.error("❌ Still missing URL after fallback!");
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
