import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";

/**
 * Browser-side Supabase client. Uses the anon key only — RLS policies
 * are the access boundary for anything this client can read/write.
 */
export function createClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
