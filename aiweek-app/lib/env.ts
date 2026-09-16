import { z } from "zod";

/**
 * Zod-validated environment. Fails fast at import time in server contexts
 * so a misconfigured deploy surfaces immediately instead of silently.
 */
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // AI concierge provider settings (provider-agnostic switch)
  AI_PROVIDER: z.enum(["openai", "anthropic", "google"]).default("openai"),
  AI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().min(1),
});

// Client-side code only ever touches the NEXT_PUBLIC_* subset.
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

function loadClientEnv() {
  return clientSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

function loadServerEnv() {
  return serverSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_MODEL: process.env.AI_MODEL,
  });
}

/** Safe to import anywhere, including client components. */
export const clientEnv = loadClientEnv();

/** Server-only. Importing this in a client bundle will break the build. */
export const serverEnv = () =>
  // Lazily validated so a client-side import of a shared module that merely
  // re-exports this function doesn't throw at module scope.
  loadServerEnv();
