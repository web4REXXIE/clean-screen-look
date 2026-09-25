import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert } from "lucide-react";
import { getMyAccount } from "@/lib/account.functions";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Web3Card } from "@/components/brand/Web3Card";
import { Button } from "@/components/ui/button";
import {
  CARD_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  dateTime,
  money,
} from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your account — WEB3 Card Activation" },
      {
        name: "description",
        content: "View your WEB3 digital card, its activation status and your service fee payments.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const fetchAccount = useServerFn(getMyAccount);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PublicLayout>
    );
  }

  if (error || !data) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold">We couldn't load your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please refresh the page. If this keeps happening, contact support.
          </p>
        </div>
      </PublicLayout>
    );
  }

  const { profile, card, codeVerified, payments, activeFee, paidPayment, isAdmin } = data;
  const status = card?.status ?? "pending_activation";
  const badge =
    status === "active" ? "ACTIVE" : status === "suspended" ? "SUSPENDED" : "PENDING";

  const steps = [
    { label: "Activation code verified", done: codeVerified },
    { label: "Service fee paid", done: Boolean(paidPayment) },
    { label: "Card activated", done: status === "active" },
  ];

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-accent">
              YOUR ACCOUNT
            </p>
            <h1 className="mt-3 text-3xl font-semibold">
              {profile?.full_name || "Cardholder"}
            </h1>
            <p className="mono mt-2 text-sm text-muted-foreground">
              {profile?.web_id ?? "—"}
            </p>
          </div>
          {isAdmin ? (
            <Button asChild variant="outline">
              <Link to="/admin">Admin portal</Link>
            </Button>
          ) : null}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Web3Card
              status={badge as "ACTIVE" | "PENDING" | "SUSPENDED"}
              holder={profile?.full_name?.toUpperCase() ?? undefined}
              last4={card?.last4 ?? undefined}
              expiry={card?.expiry ?? undefined}
            />
            <div className="panel mt-6 space-y-3 p-5 text-sm">
              <Row label="Card reference" value={card?.card_ref ?? "—"} mono />
              <Row label="Status" value={CARD_STATUS_LABEL[status] ?? status} />
              <Row label="Activated" value={dateTime(card?.activated_at)} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="panel p-6">
              <h2 className="text-lg font-medium">Activation progress</h2>
              <ol className="mt-5 space-y-3">
                {steps.map((s) => (
                  <li key={s.label} className="flex items-center gap-3 text-sm">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                        s.done
                          ? "border-success/40 bg-success/20 text-success"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {s.done ? "✓" : ""}
                    </span>
                    <span className={s.done ? "" : "text-muted-foreground"}>{s.label}</span>
                  </li>
                ))}
              </ol>
              {status !== "active" ? (
                <Button asChild className="mt-6 w-full">
                  <Link to="/activation">Continue activation</Link>
                </Button>
              ) : (
                <p className="mt-6 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-muted-foreground">
                  Your card is active. No further action is needed.
                </p>
              )}
            </div>

            <div className="panel p-6">
              <h2 className="text-lg font-medium">Service fee payments</h2>
              {payments.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No payments yet.{" "}
                  {activeFee
                    ? `The current activation service is ${activeFee.name} at ${money(activeFee.amount_cents, activeFee.currency)}.`
                    : ""}
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-lg border border-border bg-background/40 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">{p.service_name}</span>
                        <span className="text-sm">
                          {money(p.amount_cents, p.currency)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="mono">{p.reference}</span>
                        <span>{PAYMENT_STATUS_LABEL[p.status] ?? p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Service fees are charges for processing and activating your digital card.
                They do not unlock, release, or represent access to customer funds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "mono" : ""}>{value}</span>
    </div>
  );
}
