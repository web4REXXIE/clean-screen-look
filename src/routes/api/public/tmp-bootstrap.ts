import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/tmp-bootstrap")({
  server: { handlers: { POST: async () => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { count } = await db.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if (count) return Response.json({ created: false });
    const { data, error } = await db.auth.admin.createUser({ email: "admin@web3.local", password: "Sylv090@", email_confirm: true, user_metadata: { full_name: "Administrator" } });
    if (error || !data.user) return Response.json({ error: error?.message }, { status: 500 });
    await db.from("user_roles").insert({ user_id: data.user.id, role: "admin" } as any);
    await db.from("profiles").update({ created_by: "system", notes: "Primary administrator" } as any).eq("id", data.user.id);
    return Response.json({ created: true });
  } } },
});
