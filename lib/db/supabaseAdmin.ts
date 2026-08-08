import { createClient } from "@supabase/supabase-js";

//connect to .env and fetch key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

//error to show if key not found
if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

// basically saying to Connect to THIS Supabase project using THIS secret credentials from env
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
);