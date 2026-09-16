import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./http";

/**
 * Server-only Supabase client factories for the community API routes.
 *
 * NOTE on env handling: these read process.env directly and throw
 * HttpError(503) when unconfigured, instead of using lib/env.ts serverEnv().
 * serverEnv() also requires the AI concierge vars (AI_PROVIDER/AI_API_KEY/
 * AI_MODEL); the community API must keep working on deploys where the AI
 * concierge is not configured. This mirrors the convention already used by
 * app/api/concierge/route.ts.
 *
 * NEVER import this module (or the service-role client) from client
 * components — the service key bypasses RLS and must stay server-side.
 */

/** Service-role client: bypasses RLS. Only for API routes, after session + ownership checks. */
export function requireServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new HttpError(
      503,
      "Community API is not configured (missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Anon-key client: RLS policies are the access boundary (public reads). */
export function requireAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new HttpError(
      503,
      "Community API is not configured (missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
