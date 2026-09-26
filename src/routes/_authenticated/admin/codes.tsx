import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { adminListCodes, adminSetCodeStatus } from "@/lib/admin-accounts.functions";
import { Confirm, Empty, PageHeader, StatusBadge } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/codes")({ component: Codes });

function Codes() {
  const qc = useQueryClient();
  const list = useServerFn(adminListCodes);
  const setS = useServerFn(adminSetCodeStatus);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "codes"], queryFn: () => list() });
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<{ id: string; status: "active" | "disabled"; webId: string } | null>(null);
  const m = useMutation({
    mutationFn: (v: { codeId: string; status: "active" | "disabled" }) => setS({ data: v }),
    onSuccess: () => { toast.success("Code updated"); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = (data ?? []).filter((r: any) => !q || [r.profile?.web_id, r.profile?.full_name, r.status].some((v) => v?.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <PageHeader title="Activation Codes" description="Codes are masked here. To create, assign or replace a code, open the customer's account. Reveals are audit-logged." />
      <div className="relative mb-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search Web ID, name or status" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : rows.length === 0 ? <Empty>No codes found.</Empty> : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr className="border-b border-border">{["Web ID", "Code", "Status", "Card", "Created", "Last used", ""].map((h) => <th key={h} className="whitespace-nowrap p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="mono whitespace-nowrap p-3">{r.profile ? <Link className="hover:underline" to="/admin/customers/$id" params={{ id: r.user_id }}>{r.profile.web_id}</Link> : "—"}</td>
                  <td className="mono whitespace-nowrap p-3">{r.code}</td>
                  <td className="p-3"><StatusBadge value={r.status} /></td>
                  <td className="whitespace-nowrap p-3 text-xs">{r.card?.card_type}</td>
                  <td className="whitespace-nowrap p-3 text-xs">{dateTime(r.created_at)}</td>
                  <td className="whitespace-nowrap p-3 text-xs">{dateTime(r.last_used_at ?? r.verified_at)}</td>
                  <td className="p-3">
                    {r.status === "active" ? <Button size="sm" variant="outline" onClick={() => setPending({ id: r.id, status: "disabled", webId: r.profile?.web_id })}>Disable</Button>
                      : r.status === "disabled" ? <Button size="sm" variant="outline" onClick={() => setPending({ id: r.id, status: "active", webId: r.profile?.web_id })}>Re-enable</Button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Confirm open={!!pending} onOpenChange={(v) => !v && setPending(null)} title={pending?.status === "disabled" ? "Disable activation code?" : "Re-enable activation code?"} onConfirm={() => { if (pending) m.mutate({ codeId: pending.id, status: pending.status }); setPending(null); }}>
        <p>Web ID: <b className="mono">{pending?.webId}</b></p>
      </Confirm>
    </>
  );
}
