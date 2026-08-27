const DEFAULT_SUPABASE_URL = "https://ggqumovytripinnmrkaw.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_RRgJvrgfxpo7Sm0XT92j1A_Yc8KwcU6";

export function getEnvVar(key: string): string | undefined {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
}

export function getSupabaseUrl(): string {
  return getEnvVar("VITE_SUPABASE_URL") || getEnvVar("SUPABASE_URL") || DEFAULT_SUPABASE_URL;
}

export function getSupabasePublishableKey(): string {
  return (
    getEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    getEnvVar("SUPABASE_PUBLISHABLE_KEY") ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY
  );
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return getEnvVar("SUPABASE_SERVICE_ROLE_KEY") || getEnvVar("VITE_SUPABASE_SERVICE_ROLE_KEY");
}
