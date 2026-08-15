// Server-only Supabase helpers. Never import from components.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

function isNewApiKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/**
 * Builds a Supabase client that acts as the caller (RLS applies).
 * Falls back to the anonymous role when no bearer token is present.
 */
export function callerClient(): { client: SupabaseClient<Database>; token: string | null } {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const request = getRequest();
  const header = request?.headers?.get("authorization") ?? null;
  const token = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;

  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
        headers.set("apikey", key);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        else if (isNewApiKey(key)) headers.delete("Authorization");
        return fetch(input, { ...init, headers });
      },
    },
  });

  return { client, token };
}

export async function callerUserId(): Promise<string | null> {
  const { client, token } = callerClient();
  if (!token) return null;
  const { data } = await client.auth.getUser(token);
  return data.user?.id ?? null;
}
