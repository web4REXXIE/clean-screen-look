import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import {
  activateMyCard,
  getMyAccount,
  refreshPaymentStatus,
  startCheckout,
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
          "Verify your activation code, review the disclosed service fee and activate your WEB3 digital card.",
      },
    ],
  }),
  component: ActivationFlow,
});

function ActivationFlow() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const verifyCode = useServerFn(verifyActivationCode);
  const checkout = useServerFn(startCheckout);
  const refresh = useServerFn(refreshPaymentStatus);
  const activate = useServerFn(activateMyCard);

  const { data, isLoading } = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
  });

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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
  const latestPayment = payments[0] ?? null;

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
        "message" in res && res.message
          ? res.message
          : "Checkout is unavailable right now.",
      );
      await qc.invalidateQueries({ queryKey: ["my-account"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout could not be started.");
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

  return (
    <Shell title="Activate your WEB3 card">
      <ol className="space-y-5">
        {/* STEP 1 */}
        <StepCard n="01" title="VERIFY ACTIVATION CODE" done={codeVerified}>
          {codeVerified ? (
            <p className="text-sm text-muted-foreground">
              Your activation code has been verified for this account.
            </p>
          ) : (
            <form onSubmit={onVerify} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the activation code issued with your card.
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
          )}
        </StepCard>

        {/* STEP 2 */}
        <StepCard
          n="02"
          title="ACTIVATION SERVICE FEE"
          done={Boolean(paidPayment)}
          muted={!codeVerified}
        >
          {!activeFee ? (
            <p className="text-sm text-muted-foreground">
              No activation service is currently available. Please contact support.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-background/40 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-medium">{activeFee.name}</p>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                      {activeFee.description}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold">
                    {money(activeFee.amount_cents, activeFee.currency)}
                  </p>
                </div>
              </div>
              <p className="mt-4 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-muted-foreground">
                This payment is a service charge. It does not unlock, release, or
                represent access to customer funds.
              </p>

              {paidPayment ? (
                <p className="mt-4 text-sm text-success">
                  Payment confirmed — reference{" "}
                  <span className="mono">{paidPayment.reference}</span>
                </p>
              ) : (
                <>
                  {latestPayment ? (
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="mono">{latestPayment.reference}</span>
                      <span>
                        {PAYMENT_STATUS_LABEL[latestPayment.status] ?? latestPayment.status}
                      </span>
                      <button
                        type="button"
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-1 text-accent underline-offset-4 hover:underline"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${busy === "refresh" ? "animate-spin" : ""}`}
                        />
                        Check status
                      </button>
                    </div>
                  ) : null}
                  <Button
                    onClick={onCheckout}
                    disabled={!codeVerified || busy === "checkout"}
                    className="mt-5 h-11"
                  >
                    {busy === "checkout" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    CONTINUE TO SECURE CHECKOUT
                  </Button>
                  {!codeVerified ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Verify your activation code first.
                    </p>
                  ) : null}
                </>
              )}
            </>
          )}
        </StepCard>

        {/* STEP 3 */}
        <StepCard n="03" title="ACTIVATE CARD" done={false} muted={!paidPayment}>
          <p className="text-sm text-muted-foreground">
            Once your code is verified and your service fee payment is confirmed by the
            payment provider, you can activate the card. Activation is permanent and is
            recorded on your account.
          </p>
          <Button
            onClick={onActivate}
            disabled={!paidPayment || !codeVerified || busy === "activate"}
            className="mt-5 h-11"
          >
            {busy === "activate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            ACTIVATE CARD
          </Button>
        </StepCard>
      </ol>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.22em] text-accent">
          CARD ACTIVATION
        </p>
        <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
        <div className="mt-8">{children}</div>
      </div>
    </PublicLayout>
  );
}

function StepCard({
  n,
  title,
  done,
  muted,
  children,
}: {
  n: string;
  title: string;
  done: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className={`panel p-6 sm:p-8 ${muted ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="mono text-xs text-accent">{n}</span>
        <h2 className="text-sm font-semibold tracking-[0.12em]">{title}</h2>
        {done ? <CheckCircle2 className="h-4 w-4 text-success" /> : null}
      </div>
      <div className="mt-5">{children}</div>
    </li>
  );
}
