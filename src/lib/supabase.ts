import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";

// Use astro env when available; fall back to process.env in test runners
const SUPABASE_URL = (globalThis as any).SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_KEY = (globalThis as any).SUPABASE_KEY ?? process.env.SUPABASE_KEY;

export function createClient(requestHeaders: Headers, cookies: AstroCookies) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return null;
  }
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    // The @supabase/ssr client expects cookie helpers; adapt using AstroCookies
    cookies: {
      getAll() {
        return parseCookieHeader(requestHeaders.get("Cookie") ?? "").map(({ name, value }) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet: any[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  } as any);
}
