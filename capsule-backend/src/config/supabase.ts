import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_KEY.");
}

const normalizedSupabaseUrl = new URL(supabaseUrl).origin;

export const supabase = createClient(normalizedSupabaseUrl, supabaseKey);
