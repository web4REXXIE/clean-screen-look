import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Visitors sign in with the Web ID the admin created plus their password.
// The Web ID alone never grants access; the password is always required.
export const signInWithWebId = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ webId: z.string().trim().min(3).max(64), password: z.string().min(1).max(72) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createClient } = await import("@supabase/supabase-js");
    const fail = { ok: false as const, error: "Those sign-in details don't match an account." };
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("email, deactivated")
      .ilike("web_id", data.webId)
      .maybeSingle();
    if (!prof?.email || prof.deactivated) return fail;
    const pub = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data: s, error } = await pub.auth.signInWithPassword({ email: prof.email, password: data.password });
    if (error || !s.session) return fail;
    return { ok: true as const, access_token: s.session.access_token, refresh_token: s.session.refresh_token };
  });
