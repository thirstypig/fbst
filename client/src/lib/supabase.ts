import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://chiezqfroxjknjasxcjq.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoaWV6cWZyb3hqa25qYXN4Y2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDgxMDQsImV4cCI6MjA4NjQyNDEwNH0.ncVCN2uKu0B43f5TFqlQqNRlFHB47DnheRN5dQFAb-8";

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn("⚠️ VITE_SUPABASE_URL missing in env, using hardcoded fallback.");
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
