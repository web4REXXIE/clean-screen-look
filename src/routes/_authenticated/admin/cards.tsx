import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { adminListCustomers, adminSetCardStatus } from "@/lib/admin.functions";
import { Confirm, Empty, PageHeader, StatusBadge } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { CARD_STATUS_LABEL, dateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/cards")({ component: Cards });

function Cards() {
  const qc = useQueryClient();
  const list = useServerFn(adminListCustomers);
  const setS = useServerFn(adminSetCardStatus);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "customers"], queryFn: () => list() });
  const [filter, setFilter] = useState("");
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<{ cardId: string; webId: string; from: string; to: string } | null>(null);
  const m = useMutation({
    mutationFn: (v: { cardId: string; status: string }) => setS({ data: v }),
    onSuccess: () => { toast.success("Card status changed"); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = (data ?? []).filter((r: any) => r.card && (!filter || r.card.status === filter));

  return (
    <>
      <PageHeader title="Card Status" description="Manage the lifecycle of each card. Every change asks for confirmation and is written to the audit log." />
      <div className="mb-4 flex flex-wrap gap-2">
        {["", ...Object.keys(CARD_STATUS_LABEL)].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>{s ? CARD_STATUS_LABEL[s] : "All"}</Button>
        ))}
      </div>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : rows.length === 0 ? <Empty>No cards with this status.</Empty> : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr className="border-b border-border">{["Web ID", "Customer", "Card ID", "Status", "Activated", "Change to"].map((h) => <th key={h} className="whitespace-nowrap p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="mono whitespace-nowrap p-3"><Link className="hover:underline" to="/admin/customers/$id" params={{ id: r.id }}>{r.web_id}</Link></td>
                  <td className="p-3">{r.full_name}</td>
                  <td className="mono whitespace-nowrap p-3">{r.card.card_ref}</td>
                  <td className="p-3"><StatusBadge value={r.card.status} /></td>
                  <td className="whitespace-nowrap p-3 text-xs">{dateTime(r.card.activated_at)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={choice[r.card.id] ?? ""} onChange={(e) => setChoice((c) => ({ ...c, [r.card.id]: e.target.value }))}>
                        <option value="">Select…</option>
                        {Object.keys(CARD_STATUS_LABEL).filter((s) => s !== r.card.status).map((s) => <option key={s} value={s}>{CARD_STATUS_LABEL[s]}</option>)}
                      </select>
                      <Button size="sm" disabled={!choice[r.card.id]} onClick={() => setPending({ cardId: r.card.id, webId: r.web_id, from: r.card.status, to: choice[r.card.id]! })}>Apply</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Confirm open={!!pending} onOpenChange={(v) => !v && setPending(null)} title="Change card status?" onConfirm={() => { if (pending) { m.mutate({ cardId: pending.cardId, status: pending.to }); setChoice((c) => ({ ...c, [pending.cardId]: "" })); } setPending(null); }}>
        {pending ? <><p>Web ID: <b className="mono">{pending.webId}</b></p><p>Current status: <b>{CARD_STATUS_LABEL[pending.from]}</b></p><p>New status: <b>{CARD_STATUS_LABEL[pending.to]}</b></p></> : null}
      </Confirm>
    </>
  );
}
