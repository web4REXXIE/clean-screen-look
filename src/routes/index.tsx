import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Globe,
  Zap,
  LifeBuoy,
  Fingerprint,
  Lock,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Section, Eyebrow, SectionTitle, Lead } from "@/components/site/Section";
import { Web3Card } from "@/components/brand/Web3Card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WEB3 Card Activation — Activate your WEB3 digital card" },
      {
        name: "description",
        content:
          "Securely verify your Web3 identity and activate your WEB3 digital card through a streamlined account-management experience.",
      },
      {
        property: "og:title",
        content: "WEB3 Card Activation — Activate your WEB3 digital card",
      },
      {
        property: "og:description",
        content:
          "Securely verify your Web3 identity and activate your WEB3 digital card through a streamlined account-management experience.",
      },
    ],
  }),
  component: Home,
});

const HIGHLIGHTS = [
  { icon: ShieldCheck, title: "Secure identity", body: "Authenticated Web ID access" },
  { icon: Globe, title: "Global access", body: "Manage your card anywhere" },
  { icon: Zap, title: "Guided activation", body: "A clear step-by-step flow" },
  { icon: LifeBuoy, title: "Support", body: "Help at every step" },
];

const REASONS = [
  {
    icon: Fingerprint,
    title: "IDENTITY VERIFICATION",
    body: "Confirm that the card is associated with the correct authenticated Web ID.",
  },
  {
    icon: Lock,
    title: "CARD SECURITY",
    body: "Activation helps ensure that an issued card cannot simply be claimed by another user.",
  },
  {
    icon: ClipboardList,
    title: "ACCOUNT CONTROL",
    body: "Maintain a clear record of card status, activation date, and account activity.",
  },
];

const STEPS = [
  { n: "01", t: "Enter your Web ID", d: "Your Web ID identifies the account it belongs to." },
  { n: "02", t: "Authenticate", d: "Sign in to prove the account is yours before anything private is shown." },
  { n: "03", t: "Verify activation code", d: "Enter the activation code issued with your card." },
  { n: "04", t: "Review the service fee", d: "The applicable activation service fee is shown in full before you pay." },
  { n: "05", t: "Secure checkout", d: "Payment is handled by a payment provider and confirmed by them, not by this page." },
  { n: "06", t: "Card activated", d: "Your card status becomes active and a permanent activation record is created." },
];

function Home() {
  return (
    <PublicLayout>
      {/* HERO */}
      <div className="relative overflow-hidden hero-bg">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-lines" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs tracking-[0.18em] text-muted-foreground">
              WEB3 DIGITAL IDENTITY
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
              ACTIVATE YOUR WEB3 CARD.
              <span className="mt-2 block text-gradient">
                ACCESS YOUR DIGITAL IDENTITY.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Securely verify your Web3 identity and activate your digital card through
              a streamlined account-management experience designed for modern digital
              finance.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-7 text-sm tracking-[0.1em]">
                <Link to="/activate">
                  ACTIVATE CARD <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-7 text-sm tracking-[0.1em]"
              >
                <Link to="/how-it-works">LEARN MORE</Link>
              </Button>
            </div>

            <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {HIGHLIGHTS.map((h) => (
                <div key={h.title} className="rounded-xl border border-border bg-surface/50 p-4">
                  <h.icon className="h-5 w-5 text-accent" />
                  <dt className="mt-3 text-sm font-medium">{h.title}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{h.body}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -inset-10 rounded-full bg-primary/20 blur-3xl"
            />
            <Web3Card tilt className="relative" status="ACTIVE" last4="1234" />
            <p className="relative mt-6 text-center text-xs tracking-[0.22em] text-muted-foreground">
              WEB3 DIGITAL CARD
            </p>
          </div>
        </div>
      </div>

      {/* WHY */}
      <Section>
        <Eyebrow>Card activation</Eyebrow>
        <SectionTitle>WHY ACTIVATE YOUR WEB3 CARD?</SectionTitle>
        <Lead>
          Activation is the account-management step that links an issued card to the
          right authenticated Web ID. It verifies the card record, confirms that the
          correct customer is activating the correct card, enables card-management
          features, establishes the card's operational status, and keeps an auditable
          activation record on your account.
        </Lead>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {REASONS.map((r) => (
            <div key={r.title} className="panel p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <r.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-sm font-semibold tracking-[0.12em]">{r.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* STEPS */}
      <Section className="border-y border-border bg-surface/30">
        <Eyebrow>The process</Eyebrow>
        <SectionTitle>From Web ID to an active card</SectionTitle>
        <Lead>
          Every step is visible before you commit to it, including the exact service fee
          and what it covers.
        </Lead>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-border bg-background/40 p-6">
              <span className="mono text-xs text-accent">{s.n}</span>
              <h3 className="mt-3 text-base font-medium">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* FEES */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>Transparent service fees</Eyebrow>
            <SectionTitle>You always see the price before you pay</SectionTitle>
            <Lead>
              Card activation carries a clearly disclosed service fee that covers
              processing and activating your WEB3 digital card. The fee is a service
              charge. It does not unlock, release, or represent access to customer funds,
              and WEB3 never asks you to pay to release a balance.
            </Lead>
            <Lead>
              Payment is processed by a payment provider at secure checkout. Your card is
              only marked paid once that provider confirms the payment, and you receive a
              payment reference you can quote to support.
            </Lead>
          </div>
          <div className="panel p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
              CARD ACTIVATION SERVICE
            </p>
            <div className="mt-5 space-y-4 text-sm">
              <Row label="Service" value="WEB3 Card Activation" />
              <Row label="Purpose" value="Processing and activating your WEB3 digital card" />
              <Row label="Currency" value="USD" />
            </div>
            <div className="mt-6 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-muted-foreground">
              This payment is a service charge. It does not unlock, release, or represent
              access to customer funds.
            </div>
            <Button asChild className="mt-6 w-full">
              <Link to="/activate">Start activation</Link>
            </Button>
          </div>
        </div>
      </Section>
    </PublicLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border/70 pb-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
