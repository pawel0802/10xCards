import { defineMiddleware } from "astro:middleware";
import { createClient } from "@/lib/supabase";

const PROTECTED_ROUTES = ["/dashboard", "/generate", "/flashcards", "/learning", "/manual-create"];

export const onRequest = defineMiddleware(async (context, next) => {
  // Allow an E2E bypass during CI/local runs when tests set the E2E_BYPASS cookie
  // and the server process has E2E_TEST_USER defined. This keeps the bypass
  // strictly opt-in for test environments.
  try {
    const cookieHeader = context.request.headers.get("cookie") ?? "";
    if (process.env.E2E_TEST_USER && cookieHeader.includes("E2E_BYPASS=1")) {
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
      context.locals.user = { email: process.env.E2E_TEST_USER } as unknown as any;
    } else {
      const supabase = createClient(context.request.headers, context.cookies);

      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        context.locals.user = user ?? null;
      } else {
        context.locals.user = null;
      }
    }
  } catch (_err) {
    // Fail-open for middleware errors: don't block the request entirely if
    // something unexpected happens here; treat as unauthenticated.
    context.locals.user = null;
  }

  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }
  }

  return next();
});
