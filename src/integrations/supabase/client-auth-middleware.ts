// Client-side middleware that injects the Supabase JWT as a Bearer token on
// outbound server-function requests. Pair it with `requireSupabaseAuth` on
// any server function that reads the authenticated user.
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

export const sendSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      sendContext: {},
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
