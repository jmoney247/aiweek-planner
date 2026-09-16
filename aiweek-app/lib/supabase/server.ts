import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/**
 * Server-only Supabase client using the SERVICE ROLE key.
 * For API routes and server components that need privileged access
 * (e.g. resolving/creating anon sessions, moderation actions).
 * NEVER import this into a client component.
 */
export function createServiceClient() {
  const env = serverEnv();
  return createSupabaseJsClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
