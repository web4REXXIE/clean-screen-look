import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { adminDeleteFee, adminListFees, adminSaveFee } from "@/lib/admin.functions";
import { Confirm, PageHeader, StatusBadge } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dateOnly, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/fees")({ component: Fees });

type Form = {
  id?: string;
  name: string;
  description: string;
  amount: string;
  currency: string;
  effectiveDate: string;
  status: "active" | "disabled";
  paymentMethod: "stripe" | "crypto";
  walletAddress: string;
  network: string;
};

const emptyForm = (): Form => ({
  name: "",
  description: "",
  amount: "",
  currency: "USD",
  effectiveDate: new Date().toISOString().slice(0, 10),
  status: "active",
  paymentMethod: "stripe",
  walletAddress: "",
  network: "BEP-20",
});

function Fees() {
  const qc = useQueryClient();
  const list = useServerFn(adminListFees);
  const save = useServerFn(adminSaveFee);
  const del = useServerFn(adminDeleteFee);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "fees"], queryFn: () => list() });
  const [form, setForm] = useState<Form | null>(null);
  const [toDelete, setToDelete] = useState<any>(null);
  const done = { onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin"] }); setForm(null); }, onError: (e: Error) => toast.error(e.message) };
  const saveM = useMutation({ mutationFn: (f: Form) => save({ data: { ...f, amount: Number(f.amount) } }), ...done });
  const delM = useMutation({ mutationFn: (id: string) => del({ data: { id } }), ...done });

  return (
    <>
      <PageHeader
        title="Service Fees"
        description="Flat, clearly disclosed service charges (issuance, activation, replacement). The customer sees the active fee before paying. Fees never depend on any balance or amount of money."
        action={<Button onClick={() => setForm(emptyForm())}>+ Add fee</Button>}
      />
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr className="border-b border-border">{["Service", "Amount", "Method", "Status", "Effective", ""].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {(data ?? []).map((f: any) => (
                <tr key={f.id} className="border-b border-border/60 last:border-0">
                  <td className="p-3">{f.name}<div className="text-xs text-muted-foreground">{f.description}</div></td>
                  <td className="whitespace-nowrap p-3">{money(f.amount_cents, f.currency)}</td>
                  <td className="whitespace-nowrap p-3 text-xs uppercase text-muted-foreground">{f.payment_method === "crypto" ? `Crypto · ${f.network}` : "Stripe"}</td>
                  <td className="p-3"><StatusBadge value={f.status} /></td>
                  <td className="whitespace-nowrap p-3 text-xs">{dateOnly(f.effective_date)}</td>
                  <td className="whitespace-nowrap p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setForm({
                          id: f.id,
                          name: f.name,
                          description: f.description,
                          amount: String(f.amount_cents / 100),
                          currency: f.currency ?? "USD",
                          effectiveDate: f.effective_date ? String(f.effective_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
                          status: f.status,
                          paymentMethod: f.payment_method === "crypto" ? "crypto" : "stripe",
                          walletAddress: f.wallet_address ?? "",
                          network: f.network ?? "BEP-20",
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="ml-1 text-destructive" onClick={() => setToDelete(f)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Edit service fee" : "Add service fee"}</DialogTitle></DialogHeader>
          {form ? (
            <form id="fee" className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveM.mutate(form); }}>
              <div className="space-y-1"><Label>Service name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
              <div className="space-y-1"><Label>Amount</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Effective date</Label>
                <Input type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Payment method</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as Form["paymentMethod"] })}>
                  <option value="stripe">Stripe (card checkout)</option>
                  <option value="crypto">Crypto (manual wallet payment)</option>
                </select>
              </div>
              {form.paymentMethod === "crypto" ? (
                <>
                  <div className="space-y-1">
                    <Label>Network</Label>
                    <Input value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} placeholder="e.g. BEP-20, TRC-20, ERC-20" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Wallet address</Label>
                    <Input className="mono" value={form.walletAddress} onChange={(e) => setForm({ ...form, walletAddress: e.target.value })} placeholder="Paste the receiving wallet address" required />
                  </div>
                </>
              ) : null}
              <div className="space-y-1"><Label>Status</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Form["status"] })}>
                  <option value="active">Active</option><option value="disabled">Disabled</option>
                </select>
              </div>
            </form>
          ) : null}
          <DialogFooter><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" form="fee" disabled={saveM.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Confirm open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)} title="Delete service fee?" destructive confirmLabel="Delete" onConfirm={() => { delM.mutate(toDelete.id); setToDelete(null); }}>
        <p>{toDelete?.name}. Fees with payments attached can only be disabled.</p>
      </Confirm>
    </>
  );
}