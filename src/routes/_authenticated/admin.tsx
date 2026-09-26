import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/_authenticated/admin")({
  // UI gate only — every admin server function re-checks the admin role on the server.
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!data?.some((r) => r.role === "admin")) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Admin Control Center — WEB3" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
});
