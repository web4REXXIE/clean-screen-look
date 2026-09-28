import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  adminConfirmPayment,
  adminListPayments,
  adminRejectCryptoPayment,
} from "@/lib/admin.functions";
import { Confirm, Empty, PageHeader, StatusBadge } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dateTime, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/payments")({ component: Payments });

function Payments() {
  const qc = useQueryClient();
  const fn = useServerFn(adminListPayments);
  const confirmFn = useServerFn(adminConfirmPayment);
  const rejectFn = useServerFn(adminRejectCryptoPayment);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "payments"], queryFn: () => fn() });

  const [confirmPending, setConfirmPending] = useState<{ id: string; reference: string } | null>(null);
  const [rejectPending, setRejectPending] = useState<{ id: string; reference: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const confirmM = useMutation({
    mutationFn: (v: { paymentId: string }) => confirmFn({ data: v }),
    onSuccess: () => {
      toast.success("Crypto payment confirmed");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectM = useMutation({
    mutationFn: (v: { paymentId: string; reason: string }) => rejectFn({ data: v }),
    onSuccess: () => {
      toast.success("Crypto payment rejected");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Payments / Test Transactions"
        description="Stripe payments are confirmed automatically by the provider. Crypto payments require manual admin confirmation below."
      />
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : !data?.length ? <Empty>No payments yet.</Empty> : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b border-border">
                {["Reference", "Customer", "Service", "Provider", "Amount", "Status", "Created", "Paid", "Actions"].map((h) => (
                  <th key={h} className="whitespace-nowrap p-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((p: any) => {
                const isCrypto = p.provider === "crypto";
                const canAct = isCrypto && p.status === "payment_submitted";
                return (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="mono whitespace-nowrap p-3">{p.reference}</td>
                    <td className="p-3">
                      {p.customer?.full_name}
                      <div className="mono text-xs text-muted-foreground">{p.customer?.web_id}</div>
                    </td>
                    <td className="p-3">{p.service_name}</td>
                    <td className="p-3">
                      {isCrypto ? (
                        <div className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Crypto</span>
                          {p.crypto_tx_reference ? (
                            <div className="mono text-xs">{p.crypto_tx_reference}</div>
                          ) : null}
                          {p.crypto_submitted_at ? (
                            <div className="text-xs text-muted-foreground">Submitted {dateTime(p.crypto_submitted_at)}</div>
                          ) : null}
                          {p.cryptoNetwork ? (
                            <div className="text-xs text-muted-foreground">{p.cryptoNetwork}</div>
                          ) : null}
                          {p.cryptoAddress ? (
                            <div className="mono break-all text-xs text-muted-foreground">{p.cryptoAddress}</div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">{p.provider}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3">{money(p.amount_cents, p.currency)}</td>
                    <td className="p-3"><StatusBadge value={p.status} /></td>
                    <td className="whitespace-nowrap p-3 text-xs">{dateTime(p.created_at)}</td>
                    <td className="whitespace-nowrap p-3 text-xs">{dateTime(p.paid_at)}</td>
                    <td className="p-3">
                      {canAct ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setConfirmPending({ id: p.id, reference: p.reference })}>
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRejectReason("");
                              setRejectPending({ id: p.id, reference: p.reference });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Confirm
        open={!!confirmPending}
        onOpenChange={(v) => !v && setConfirmPending(null)}
        title="Confirm crypto payment?"
        confirmLabel="Confirm payment"
        onConfirm={() => {
          if (confirmPending) confirmM.mutate({ paymentId: confirmPending.id });
          setConfirmPending(null);
        }}
      >
        {confirmPending ? (
          <p>
            Reference: <b className="mono">{confirmPending.reference}</b>
          </p>
        ) : null}
        <p>This marks the payment as paid and unlocks activation-code verification for the customer.</p>
      </Confirm>

      <Confirm
        open={!!rejectPending}
        onOpenChange={(v) => !v && setRejectPending(null)}
        title="Reject crypto payment?"
        destructive
        confirmLabel="Reject payment"
        onConfirm={() => {
          if (!rejectPending) return;
          const reason = rejectReason.trim();
          if (reason.length < 3) {
            toast.error("Please provide a reason (at least 3 characters) before rejecting.");
            return;
          }
          rejectM.mutate({ paymentId: rejectPending.id, reason });
          setRejectPending(null);
          setRejectReason("");
        }}
      >
        {rejectPending ? (
          <p>
            Reference: <b className="mono">{rejectPending.reference}</b>
          </p>
        ) : null}
        <div className="space-y-1">
          <Label htmlFor="reject-reason">Reason</Label>
          <Textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Why is this payment being rejected?"
          />
        </div>
      </Confirm>
    </>
  );
}