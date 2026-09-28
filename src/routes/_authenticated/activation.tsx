import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  activateMyCard,
  getMyAccount,
  refreshPaymentStatus,
  startCheckout,
  submitCryptoPayment,
  verifyActivationCode,
} from "@/lib/account.functions";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Web3Card } from "@/components/brand/Web3Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_STATUS_LABEL, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/activation")({
  validateSearch: z.object({
    payment: z.enum(["submitted", "cancelled"]).optional(),
    ref: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Activate your card — WEB3" },
      {
        name: "description",
        content:
          "Review your service fee, pay by card or crypto, then verify your activation code and activate your WEB3 digital card.",
      },
    ],
  }),
  component: ActivationFlow,
});

type PaymentMethod = "stripe" | "crypto";
type StepKey = "payment" | "code" | "activate";
type StepStatus = "done" | "active" | "locked";

const STEP_ORDER: StepKey[] = ["payment", "code", "activate"];
const STEP_META: { key: StepKey; label: string; lockedHint?: string }[] = [
  { key: "payment", label: "Payment" },
  { key: "code", label: "Activation Code", lockedHint: "Unlocks after payment is confirmed" },
  { key: "activate", label: "Activate Card", lockedHint: "Unlocks after your code is verified" },
];

function stepStatus(step: StepKey, phase: StepKey): StepStatus {
  const stepIdx = STEP_ORDER.indexOf(step);
  const phaseIdx = STEP_ORDER.indexOf(phase);
  if (stepIdx < phaseIdx) return "done";
  if (stepIdx === phaseIdx) return "active";
  return "locked";
}

function toCardStatus(status: string | undefined): "PENDING" | "ACTIVE" | "SUSPENDED" {
  if (status === "active") return "ACTIVE";
  if (status === "suspended") return "SUSPENDED";
  return "PENDING";
}

function ActivationFlow() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const verifyCode = useServerFn(verifyActivationCode);
  const checkout = useServerFn(startCheckout);
  const refresh = useServerFn(refreshPaymentStatus);
  const activate = useServerFn(activateMyCard);
  const submitCrypto = useServerFn(submitCryptoPayment);

  const { data, isLoading } = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
  });

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [txRef, setTxRef] = useState("");
  const [txError, setTxError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (search.payment === "submitted") {
      toast.success("Payment submitted. Waiting for confirmation from the provider.");
      void handleRefresh();
    }
    if (search.payment === "cancelled") {
      toast.error("Checkout was cancelled. Your card is still pending activation.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.payment]);

  async function handleRefresh() {
    setBusy("refresh");
    try {
      await refresh();
      await qc.invalidateQueries({ queryKey: ["my-account"] });
    } catch {
      toast.error("Could not check the payment status right now.");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading || !data) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PublicLayout>
    );
  }

  const { card, codeVerified, paidPayment, activeFee, payments, profile } = data;
  const status = card?.status ?? "pending_activation";

  // Generated Supabase types may not know about the new crypto columns yet — local cast.
  const fee = activeFee as
    | (typeof activeFee & {
        crypto_network?: string | null;
        crypto_address?: string | null;
      })
    | null;
  const stripePayment = (payments as any[]).find((p) => p.provider === "stripe") ?? null;
  const cryptoPayment = (payments as any[]).find((p) => p.provider === "crypto") ?? null;

  if (!card) {
    return (
      <Shell title="No card on this account">
        <p className="text-sm text-muted-foreground">
          There is no card record linked to this account yet. Contact support with your
          Web ID and a card can be issued to you.
        </p>
      </Shell>
    );
  }

  if (status === "suspended" || status === "expired" || status === "cancelled") {
    return (
      <Shell title="This card is suspended">
        <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p>
            A suspended card cannot be activated. Please contact support quoting your Web
            ID <span className="mono">{profile?.web_id}</span>.
          </p>
        </div>
      </Shell>
    );
  }

  if (status === "active") {
    return (
      <Shell title="Your card is active">
        <div className="grid gap-8 lg:grid-cols-2">
          <Web3Card
            status="ACTIVE"
            holder={profile?.full_name?.toUpperCase() ?? undefined}
            last4={card.last4 ?? undefined}
            expiry={card.expiry ?? undefined}
          />
          <div>
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Activation complete</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Your WEB3 digital card has been activated and a permanent activation record
              has been written to your account.
            </p>
            <Button asChild className="mt-6">
              <Link to="/dashboard">Go to your account</Link>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  const phase: StepKey = !paidPayment ? "payment" : !codeVerified ? "code" : "activate";

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy("code");
    setCodeError(null);
    try {
      const res = await verifyCode({ data: { code } });
      if (!res.ok) {
        setCodeError(res.message);
      } else {
        toast.success(res.message);
        await qc.invalidateQueries({ queryKey: ["my-account"] });
      }
    } catch {
      setCodeError("We couldn't verify that code. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function onCheckout() {
    setBusy("checkout");
    try {
      const res = await checkout({ data: { origin: window.location.origin } });
      if (res.ok && res.url) {
        window.location.href = res.url;
        return;
      }
      toast.error(
        "message" in res && res.message ? res.message : "Checkout is unavailable right now.",
      );
      await qc.invalidateQueries({ queryKey: ["my-account"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout could not be started.");
    } finally {
      setBusy(null);
    }
  }

  async function onSubmitCrypto(e: React.FormEvent) {
    e.preventDefault();
    setTxError(null);
    const trimmed = txRef.trim();
    if (trimmed.length < 6) {
      setTxError("Enter the transaction hash or reference for your payment.");
      return;
    }
    setBusy("crypto");
    try {
      await submitCrypto({ data: { txReference: trimmed } });
      toast.success("Payment submitted. An administrator will review and confirm it.");
      setTxRef("");
      await qc.invalidateQueries({ queryKey: ["my-account"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit your payment.");
    } finally {
      setBusy(null);
    }
  }

  async function onActivate() {
    setBusy("activate");
    try {
      await activate();
      toast.success("Your card has been activated.");
      await qc.invalidateQueries({ queryKey: ["my-account"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation could not be completed.");
    } finally {
      setBusy(null);
    }
  }

  async function onCopyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy. Please copy the address manually.");
    }
  }

  function renderCryptoForm() {
    if (!fee?.crypto_network || !fee?.crypto_address) {
      return (
        <p className="text-sm text-muted-foreground">
          Crypto payment isn't configured right now. Please contact support or pay with card.
        </p>
      );
    }
    return (
      <div className="space-y-4">
        <div className="space-y-3 rounded-lg border border-border bg-background/40 p-5 text-sm">
          <Row label="Network" value={fee.crypto_network} mono />
          <div>
            <p className="text-muted-foreground">Send to address</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="mono min-w-0 flex-1 break-all rounded-md bg-background/60 p-2 text-xs">
                {fee.crypto_address}
              </p>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Copy wallet address"
                onClick={() => onCopyAddress(fee.crypto_address as string)}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Row label="Amount" value={money(fee.amount_cents, fee.currency)} />
        </div>
        <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>
            Send exactly {money(fee.amount_cents, fee.currency)} to the address above, on
            the {fee.crypto_network} network. A different amount or network may delay or
            prevent confirmation.
          </p>
        </div>
        <form onSubmit={onSubmitCrypto} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="tx-ref">Transaction hash / reference</Label>
            <Input
              id="tx-ref"
              value={txRef}
              onChange={(e) => setTxRef(e.target.value)}
              placeholder="0x… or exchange reference"
              className="mono h-12"
              aria-invalid={Boolean(txError)}
            />
            {txError ? (
              <p className="text-sm text-destructive" role="alert">
                {txError}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={busy === "crypto"} className="h-11 w-full sm:w-auto">
            {busy === "crypto" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            I'VE SENT THE PAYMENT
          </Button>
        </form>
      </div>
    );
  }

  function renderPaymentStep() {
    if (cryptoPayment && cryptoPayment.status === "payment_submitted") {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
            <span className="font-medium">Payment submitted — waiting for admin confirmation.</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="mono">{cryptoPayment.reference}</span>
            <span>
              Tx reference: <span className="mono">{cryptoPayment.crypto_tx_reference}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1 text-sm text-accent underline-offset-4 hover:underline"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy === "refresh" ? "animate-spin" : ""}`} />
            Check status
          </button>
        </div>
      );
    }

    if (cryptoPayment && cryptoPayment.status === "payment_failed") {
      return (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Payment rejected</p>
              <p className="mt-1 text-muted-foreground">
                {cryptoPayment.crypto_rejection_reason ??
                  "This payment was rejected. Please submit a new transaction reference."}
              </p>
            </div>
          </div>
          {renderCryptoForm()}
        </div>
      );
    }

    if (stripePayment) {
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="mono">{stripePayment.reference}</span>
            <span>{PAYMENT_STATUS_LABEL[stripePayment.status] ?? stripePayment.status}</span>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1 text-accent underline-offset-4 hover:underline"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy === "refresh" ? "animate-spin" : ""}`} />
              Check status
            </button>
          </div>
          <Button onClick={onCheckout} disabled={busy === "checkout"} className="h-11">
            {busy === "checkout" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            RESUME SECURE CHECKOUT
          </Button>
        </div>
      );
    }

    if (method === "crypto") {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setMethod(null)}
            className="text-xs text-accent underline-offset-4 hover:underline"
          >
            ← Choose a different method
          </button>
          {renderCryptoForm()}
        </div>
      );
    }

    if (method === "stripe") {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setMethod(null)}
            className="text-xs text-accent underline-offset-4 hover:underline"
          >
            ← Choose a different method
          </button>
          <Button onClick={onCheckout} disabled={busy === "checkout"} className="h-11">
            {busy === "checkout" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            CONTINUE TO SECURE CHECKOUT
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMethod("stripe")}
          className="panel p-4 text-left transition hover:border-accent"
        >
          <p className="text-sm font-semibold">Pay with card</p>
          <p className="mt-1 text-xs text-muted-foreground">Secure checkout via Stripe.</p>
        </button>
        <button
          type="button"
          onClick={() => setMethod("crypto")}
          disabled={!fee?.crypto_network || !fee?.crypto_address}
          className="panel p-4 text-left transition hover:border-accent disabled:opacity-50"
        >
          <p className="text-sm font-semibold">Pay with crypto</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {fee?.crypto_network ? `Send ${fee.crypto_network}.` : "Not currently available."}
          </p>
        </button>
      </div>
    );
  }

  function renderPhaseContent() {
    if (phase === "payment") {
      return (
        <div className="space-y-5">
          {fee ? (
            <div className="rounded-lg border border-border bg-background/40 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-medium">{fee.name}</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">{fee.description}</p>
                </div>
                <p className="text-2xl font-semibold">{money(fee.amount_cents, fee.currency)}</p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                This is a service charge. It does not unlock, release, or represent access
                to customer funds.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No activation service is currently available. Please contact support.
            </p>
          )}
          {fee ? renderPaymentStep() : null}
        </div>
      );
    }

    if (phase === "code") {
      return (
        <form onSubmit={onVerify} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your payment is confirmed. Enter the activation code issued with your card.
          </p>
          <div className="space-y-2">
            <Label htmlFor="code">Activation code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ACT-7845-9K2"
              className="mono h-12 tracking-[0.12em]"
              aria-invalid={Boolean(codeError)}
            />
            {codeError ? (
              <p className="text-sm text-destructive" role="alert">
                {codeError}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={busy === "code"} className="h-11">
            {busy === "code" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            VERIFY ACTIVATION CODE
          </Button>
        </form>
      );
    }

    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Your payment is confirmed and your activation code is verified. Activation is
          permanent and is recorded on your account.
        </p>
        <Button onClick={onActivate} disabled={busy === "activate"} className="h-11">
          {busy === "activate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          ACTIVATE CARD
        </Button>
      </div>
    );
  }

  const activeLabel = STEP_META.find((s) => s.key === phase)?.label ?? "";
  const activeIndex = STEP_ORDER.indexOf(phase);

  return (
    <Shell title="Activate your WEB3 card">
      <StepBar phase={phase} />
      <div className="mt-8 grid gap-8 lg:grid-cols-[300px_1fr]">
        <div>
          <Web3Card
            status={toCardStatus(card.status)}
            holder={profile?.full_name?.toUpperCase() ?? undefined}
            last4={card.last4 ?? undefined}
            expiry={card.expiry ?? undefined}
          />
          <div className="mt-4 text-sm">
            <Row label="Web ID" value={profile?.web_id ?? "—"} mono />
          </div>
        </div>
        <div className="panel p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-[0.22em] text-accent">
            STEP {activeIndex + 1} OF {STEP_ORDER.length}
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-[0.04em]">{activeLabel}</h2>
          <div className="mt-5">{renderPhaseContent()}</div>
        </div>
      </div>
    </Shell>
  );
}

function StepBar({ phase }: { phase: StepKey }) {
  return (
    <ol className="flex items-center">
      {STEP_META.map((step, i) => {
        const status = stepStatus(step.key, phase);
        const isLast = i === STEP_META.length - 1;
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-initial">
            <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  status === "done"
                    ? "border-success/40 bg-success/15 text-success"
                    : status === "active"
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-background/40 text-muted-foreground"
                }`}
              >
                {status === "done" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : status === "locked" ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  i + 1
                )}
              </div>
              <div>
                <span
                  className={`text-[11px] font-medium tracking-[0.08em] sm:text-xs ${
                    status === "locked" ? "text-muted-foreground" : ""
                  }`}
                >
                  {step.label.toUpperCase()}
                </span>
                {status === "locked" && step.lockedHint ? (
                  <p className="hidden text-[10px] text-muted-foreground sm:block">
                    {step.lockedHint}
                  </p>
                ) : null}
              </div>
            </div>
            {!isLast ? <span className="mx-3 hidden h-px flex-1 bg-border sm:block" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.22em] text-accent">CARD ACTIVATION</p>
        <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
        <div className="mt-8">{children}</div>
      </div>
    </PublicLayout>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "mono" : ""}>{value}</span>
    </div>
  );
}