import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search } from "lucide-react";
import { adminListAudit } from "@/lib/admin.functions";
import { Empty, PageHeader } from "@/components/admin/AdminShell";
import { Input } from "@/components/ui/input";
import { dateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/audit")({ component: Audit });

function Audit() {
  const fn = useServerFn(adminListAudit);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "audit"], queryFn: () => fn() });
  const [q, setQ] = useState("");
  const rows = (data ?? []).filter((l: any) => !q || [l.action, l.web_id, l.actor_label].some((v) => v?.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHeader title="Audit Logs" description="Permanent record of every important action. Entries cannot be edited or deleted." />
      <div className="relative mb-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search action, Web ID or administrator" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : rows.length === 0 ? <Empty>No entries.</Empty> : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr className="border-b border-border">{["Timestamp", "Administrator", "Action", "Web ID", "Previous", "New"].map((h) => <th key={h} className="whitespace-nowrap p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((l: any) => (
                <tr key={l.id} className="border-b border-border/60 last:border-0">
                  <td className="whitespace-nowrap p-3 text-xs">{dateTime(l.created_at)}</td>
                  <td className="p-3">{l.actor_label}</td>
                  <td className="p-3">{l.action}</td>
                  <td className="mono whitespace-nowrap p-3">{l.web_id ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{l.previous_state ?? "—"}</td>
                  <td className="p-3 text-xs">{l.new_state ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
