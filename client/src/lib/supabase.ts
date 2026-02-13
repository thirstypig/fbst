import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ CRITICAL: Supabase keys missing in Client!");
  console.log("VITE_SUPABASE_URL:", supabaseUrl);
  console.log("VITE_SUPABASE_ANON_KEY:", supabaseAnonKey ? "(Set)" : "(Missing)");
} else {
  console.log("✅ Supabase Client Initialized:", supabaseUrl);
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || ""
);
