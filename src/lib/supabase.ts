import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

interface CookiePair {
  name: string;
  value: string;
}

interface SetCookieArg {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

export function createClient(requestHeaders: Headers, cookies?: AstroCookies) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return null;
  }

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll(): CookiePair[] {
        const header = requestHeaders.get("cookie") ?? requestHeaders.get("Cookie") ?? "";
        return parseCookieHeader(header).map(({ name, value }) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet: SetCookieArg[]) {
        if (!cookies) return;
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  });
}
