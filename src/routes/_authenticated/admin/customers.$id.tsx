import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Copy, Eye, Loader2 } from "lucide-react";
import { adminSetCardStatus } from "@/lib/admin.functions";
import {
  adminGetAccount,
  adminReplaceCode,
  adminResetWorkflow,
  adminRevealCode,
  adminSetDeactivated,
  adminUpdateAccount,
} from "@/lib/admin-accounts.functions";
import { Confirm, PageHeader, StatusBadge, activationStatus } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CARD_STATUS_LABEL, PAYMENT_STATUS_LABEL, dateTime, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/customers/$id")({ component: Account });

type Pending = { title: string; body: React.ReactNode; run: () => Promise<unknown>; destructive?: boolean } | null;

function Account() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const get = useServerFn(adminGetAccount);
  const setStatus = useServerFn(adminSetCardStatus);
  const replace = useServerFn(adminReplaceCode);
  const reset = useServerFn(adminResetWorkflow);
  const deact = useServerFn(adminSetDeactivated);
  const update = useServerFn(adminUpdateAccount);
  const reveal = useServerFn(adminRevealCode);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "account", id], queryFn: () => get({ data: { id } }) });
  const [pending, setPending] = useState<Pending>(null);
  const [newStatus, setNewStatus] = useState("");
  const [edit, setEdit] = useState<{ fullName: string; notes: string } | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  if (error || !data) return <p className="text-sm text-destructive">Account not found.</p>;
  const { profile: p, card, codes, payments, history } = data as any;
  const active = codes.find((c: any) => c.status === "active");
  const paid = payments.find((x: any) => x.status === "paid");
  const act = activationStatus(card, active);
  const step = card?.status === "active" ? "Completed" : paid ? "Awaiting activation" : active?.verified_at ? "Service fee payment" : "Activation code verification";

  return (
    <>
      <Link to="/admin/customers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All records</Link>
      <PageHeader title={p.full_name} description={p.web_id} action={<div className="flex gap-2">{p.is_demo ? <StatusBadge value="demo" /> : null}{p.deactivated ? <StatusBadge value="deactivated" /> : null}</div>} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Account information">
          <Row l="Web ID" v={<span className="mono">{p.web_id}</span>} />
          <Row l="Customer" v={p.full_name} />
          <Row l="Email" v={p.email} />
          <Row l="Card ID" v={<span className="mono">{card?.card_ref ?? "—"}</span>} />
          <Row l="Created" v={`${dateTime(p.created_at)} · ${p.created_by}`} />
          <Row l="Last updated" v={`${dateTime(p.updated_at)} · ${p.updated_by}`} />
          {p.notes ? <Row l="Notes" v={p.notes} /> : null}
        </Section>
        <Section title="Card information">
          <Row l="Card type" v={card?.card_type ?? "—"} />
          <Row l="Card status" v={card ? <StatusBadge value={card.status} /> : "—"} />
          <Row l="Activation status" v={<StatusBadge value={act} />} />
          <Row l="Activation date" v={dateTime(card?.activated_at)} />
        </Section>
        <Section title="Activation information">
          <Row l="Current workflow step" v={step} />
          <Row l="Service fee" v={paid ? `${paid.service_name} · ${money(paid.amount_cents, paid.currency)} (${PAYMENT_STATUS_LABEL[paid.status]})` : "Not paid yet"} />
          <div className="mt-3 space-y-2">
            {codes.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
                <span className="mono">{revealed[c.id] ?? c.code}</span>
                <span className="flex items-center gap-2">
                  <StatusBadge value={c.status} />
                  {revealed[c.id] ? (
                    <Button size="icon" variant="ghost" aria-label="Copy" onClick={() => { navigator.clipboard.writeText(revealed[c.id] ?? ""); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button>
                  ) : (
                    <Button size="icon" variant="ghost" aria-label="Reveal" onClick={() => setPending({ title: "Reveal activation code?", body: "This will be recorded in the audit log.", run: async () => { const r = await reveal({ data: { codeId: c.id } }); setRevealed((s) => ({ ...s, [c.id]: r.code })); } })}><Eye className="h-4 w-4" /></Button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Admin actions">
          {edit ? (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run.mutate(() => update({ data: { id, ...edit } }), { onSuccess: () => setEdit(null) }); }}>
              <div className="space-y-1"><Label>Customer name</Label><Input value={edit.fullName} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} /></div>
              <div className="space-y-1"><Label>Notes</Label><Textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
              <div className="flex gap-2"><Button type="submit" size="sm">Save</Button><Button type="button" size="sm" variant="outline" onClick={() => setEdit(null)}>Cancel</Button></div>
            </form>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => setEdit({ fullName: p.full_name, notes: p.notes })}>Edit account</Button>
              {card ? (
                <div className="flex gap-2">
                  <select className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="">Change status…</option>
                    {Object.keys(CARD_STATUS_LABEL).filter((s) => s !== card.status).map((s) => <option key={s} value={s}>{CARD_STATUS_LABEL[s]}</option>)}
                  </select>
                  <Button disabled={!newStatus} onClick={() => setPending({ title: "Change card status?", body: <><p>Web ID: <b className="mono">{p.web_id}</b></p><p>Current status: <b>{CARD_STATUS_LABEL[card.status]}</b></p><p>New status: <b>{CARD_STATUS_LABEL[newStatus]}</b></p></>, run: async () => { await setStatus({ data: { cardId: card.id, status: newStatus } }); setNewStatus(""); } })}>Go</Button>
                </div>
              ) : null}
              <Button variant="outline" onClick={() => setPending({ title: "Reset activation workflow?", body: "The card returns to Pending and the activation code must be verified again. Payment records are kept.", run: () => reset({ data: { userId: id } }) })}>Reset activation workflow</Button>
              <Button variant="outline" onClick={() => setPending({ title: "Replace activation code?", body: "A new unique code is generated and the current one stops working.", run: () => replace({ data: { userId: id } }) })}>Replace activation code</Button>
              <Button variant={p.deactivated ? "outline" : "destructive"} className="sm:col-span-2" onClick={() => setPending({ title: p.deactivated ? "Reactivate account?" : "Deactivate account?", body: p.deactivated ? "The customer can sign in again." : "The customer will no longer be able to sign in.", destructive: !p.deactivated, run: () => deact({ data: { userId: id, deactivated: !p.deactivated } }) })}>{p.deactivated ? "Reactivate account" : "Deactivate account"}</Button>
            </div>
          )}
        </Section>
      </div>

      <Section title="Workflow history" className="mt-4">
        {history.length === 0 ? <p className="text-sm text-muted-foreground">No history.</p> : history.map((h: any) => (
          <div key={h.id} className="flex flex-col gap-1 border-b border-border/60 py-2 text-sm last:border-0 sm:flex-row sm:justify-between">
            <span>{h.action}{h.previous_state || h.new_state ? <span className="text-muted-foreground"> · {h.previous_state ?? "—"} → {h.new_state ?? "—"}</span> : null}</span>
            <span className="text-xs text-muted-foreground">{h.actor_label} · {dateTime(h.created_at)}</span>
          </div>
        ))}
      </Section>

      <Confirm open={!!pending} onOpenChange={(v) => !v && setPending(null)} title={pending?.title ?? ""} destructive={pending?.destructive} onConfirm={() => { if (pending) run.mutate(pending.run); setPending(null); }}>
        {pending?.body}
      </Confirm>
    </>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel p-5 ${className}`}>
      <h2 className="mb-3 text-xs font-semibold tracking-[0.18em] text-accent">{title.toUpperCase()}</h2>
      {children}
    </section>
  );
}
function Row({ l, v }: { l: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-border/40 py-2 text-sm last:border-0"><span className="text-muted-foreground">{l}</span><span className="text-right">{v}</span></div>;
}
