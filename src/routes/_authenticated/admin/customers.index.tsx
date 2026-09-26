import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Search, Wand2 } from "lucide-react";
import { adminListCustomers } from "@/lib/admin.functions";
import { adminCreateAccount, adminGenerateWebId } from "@/lib/admin-accounts.functions";
import { PageHeader, StatusBadge, activationStatus, Empty } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { dateOnly } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/customers/")({
  validateSearch: z.object({ create: z.boolean().optional() }),
  component: Customers,
});

function Customers() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const fn = useServerFn(adminListCustomers);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "customers"], queryFn: () => fn() });
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data ?? []).filter((r: any) => {
      if (!t) return true;
      const act = activationStatus(r.card, r.code);
      return [r.web_id, r.full_name, r.email, r.card?.card_ref, r.card?.status, act, r.code?.status]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(t));
    });
  }, [data, q]);

  return (
    <>
      <PageHeader
        title="Customer Records & Web IDs"
        description="Search by Web ID, name, card ID or status. Activation codes are masked; reveal them from the account page."
        action={<Button onClick={() => navigate({ to: ".", search: { create: true } })}>+ Create Web ID</Button>}
      />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search WEB3-915AA7E3, name, CARD-…, active…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : rows.length === 0 ? <Empty>No matching records.</Empty> : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b border-border">
                {["Web ID", "Customer", "Card ID", "Card", "Activation", "Code", "Created", "Updated", ""].map((h) => <th key={h} className="whitespace-nowrap p-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="mono whitespace-nowrap p-3">{r.web_id}{r.is_demo ? <span className="ml-2 text-[10px] text-warning">DEMO</span> : null}</td>
                  <td className="p-3">{r.full_name}<div className="text-xs text-muted-foreground">{r.email}</div></td>
                  <td className="mono whitespace-nowrap p-3">{r.card?.card_ref ?? "—"}</td>
                  <td className="p-3">{r.deactivated ? <StatusBadge value="deactivated" /> : r.card ? <StatusBadge value={r.card.status} /> : "—"}</td>
                  <td className="p-3"><StatusBadge value={activationStatus(r.card, r.code)} /></td>
                  <td className="mono whitespace-nowrap p-3 text-xs">{r.code?.code ?? "—"}</td>
                  <td className="whitespace-nowrap p-3 text-xs">{dateOnly(r.created_at)}</td>
                  <td className="whitespace-nowrap p-3 text-xs">{dateOnly(r.updated_at)}</td>
                  <td className="p-3"><Button asChild size="sm" variant="outline"><Link to="/admin/customers/$id" params={{ id: r.id }}>View account</Link></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CreateDialog open={!!search.create} onClose={() => navigate({ to: ".", search: {} })} />
    </>
  );
}

const EMPTY = { webId: "", fullName: "", email: "", password: "", cardRef: "", code: "", cardStatus: "pending_activation", notes: "", demo: true };

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const gen = useServerFn(adminGenerateWebId);
  const create = useServerFn(adminCreateAccount);
  const [f, setF] = useState({ ...EMPTY });
  const set = (k: keyof typeof EMPTY) => (e: any) => setF((s) => ({ ...s, [k]: e.target.value }));

  const genM = useMutation({
    mutationFn: () => gen(),
    onSuccess: (r) => setF((s) => ({ ...s, webId: r.webId, cardRef: s.cardRef || r.cardRef, code: s.code || r.code })),
    onError: (e: Error) => toast.error(e.message),
  });
  const createM = useMutation({
    mutationFn: () => create({ data: f as any }),
    onSuccess: (r) => {
      toast.success(`Web ID ${f.webId} created`);
      qc.invalidateQueries({ queryKey: ["admin"] });
      setF({ ...EMPTY });
      navigate({ to: "/admin/customers/$id", params: { id: r.id } });
    },
    onError: (e: Error) => {
      let msg = e.message;
      try { const issues = JSON.parse(msg); msg = issues.map((i: any) => i.message).join(" · "); } catch { /* plain message */ }
      toast.error(msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Create Customer Record</DialogTitle></DialogHeader>
        <form id="create-acc" className="space-y-4" onSubmit={(e) => { e.preventDefault(); createM.mutate(); }}>
          <div className="space-y-2">
            <Label>Web ID</Label>
            <div className="flex gap-2">
              <Input className="mono" placeholder="WEB3-XXXXXXXX" value={f.webId} onChange={set("webId")} required />
              <Button type="button" variant="outline" onClick={() => genM.mutate()} disabled={genM.isPending}>
                {genM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}<span className="ml-1 hidden sm:inline">Generate</span>
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Customer name</Label><Input value={f.fullName} onChange={set("fullName")} required /></div>
            <div className="space-y-2"><Label>Customer email</Label><Input type="email" value={f.email} onChange={set("email")} required /></div>
          </div>
          <div className="space-y-2">
            <Label>Temporary password</Label>
            <Input type="text" minLength={8} value={f.password} onChange={set("password")} required />
            <p className="text-xs text-muted-foreground">Share this securely with the customer so they can sign in. At least 8 characters.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Card ID</Label><Input className="mono" placeholder="CARD-XXXXXXXX" value={f.cardRef} onChange={set("cardRef")} required /></div>
            <div className="space-y-2"><Label>Activation code</Label><Input className="mono" placeholder="ACT-XXXX-XXX" value={f.code} onChange={set("code")} required /></div>
          </div>
          <div className="space-y-2">
            <Label>Card status</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.cardStatus} onChange={set("cardStatus")}>
              <option value="pending_activation">Pending</option>
              <option value="activation_pending">Activation pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={f.notes} onChange={set("notes")} maxLength={1000} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.demo} onChange={(e) => setF((s) => ({ ...s, demo: e.target.checked }))} /> Mark as TEST / DEMO record</label>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="create-acc" disabled={createM.isPending}>{createM.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
