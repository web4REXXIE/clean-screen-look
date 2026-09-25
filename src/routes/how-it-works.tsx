import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Section, Eyebrow, SectionTitle, Lead } from "@/components/site/Section";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How activation works — WEB3" },
      {
        name: "description",
        content:
          "Step by step: Web ID, authentication, activation code, disclosed service fee, secure checkout, payment confirmation and card activation.",
      },
      { property: "og:title", content: "How activation works — WEB3" },
      {
        property: "og:description",
        content:
          "Web ID, authentication, activation code, disclosed service fee, secure checkout and card activation.",
      },
    ],
  }),
  component: HowItWorks,
});

const STEPS = [
  {
    t: "1. Enter your Web ID",
    d: "Your Web ID, in the format WEB3-915AA7E3, identifies the account your card belongs to. On its own it reveals nothing about the account.",
  },
  {
    t: "2. Authenticate",
    d: "Sign in to the account. Only after authentication does WEB3 show your card record, its status or any payment information.",
  },
  {
    t: "3. Verify your activation code",
    d: "The activation code, in the format ACT-7845-9K2, is issued with your card. Verifying it confirms that the right customer is activating the right card.",
  },
  {
    t: "4. Review the service fee",
    d: "WEB3 shows the currently applicable activation service, its description and its exact price. This is a service charge for processing and activating your digital card.",
  },
  {
    t: "5. Pay at secure checkout",
    d: "Checkout is handled by a payment provider. WEB3 records the amount, currency, service and a payment reference such as WEB3-PAY-8F31A92C.",
  },
  {
    t: "6. Payment confirmation",
    d: "The payment provider confirms the payment back to WEB3. Until that confirmation arrives your payment stays in a pending state — nothing in your browser can change it.",
  },
  {
    t: "7. Card activation",
    d: "With a verified code and a confirmed payment your card becomes eligible for activation. Activating it sets the card status to active and writes a permanent activation record.",
  },
];

const FAQ = [
  {
    q: "Where do I find my activation code?",
    a: "It is provided with your card, or through the authorized WEB3 account that issued it. If you cannot locate it, contact support instead of guessing — repeated invalid attempts are logged.",
  },
  {
    q: "Does the fee release money to me?",
    a: "No. The fee is a service charge for processing and activating the card. It does not unlock, release, or represent access to customer funds.",
  },
  {
    q: "What if my payment fails or is cancelled?",
    a: "Your card simply stays in pending activation and you can start checkout again. Failed and cancelled payments are recorded with their own status.",
  },
  {
    q: "Can somebody else activate my card?",
    a: "No. A card can only be activated from the authenticated account that the card record is linked to.",
  },
];

function HowItWorks() {
  return (
    <PublicLayout>
      <Section className="hero-bg">
        <Eyebrow>How it works</Eyebrow>
        <SectionTitle>Activation, step by step</SectionTitle>
        <Lead>
          Nothing in this flow happens silently. Each step tells you what it does, what it
          costs if anything, and what changes on your account afterwards.
        </Lead>
        <div className="mt-10 space-y-4">
          {STEPS.map((s) => (
            <div key={s.t} className="panel p-6">
              <h3 className="text-base font-medium">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
        <Button asChild size="lg" className="mt-10">
          <Link to="/activate">Start activation</Link>
        </Button>
      </Section>

      <Section className="border-t border-border bg-surface/30">
        <Eyebrow>Questions</Eyebrow>
        <SectionTitle>Frequently asked</SectionTitle>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-xl border border-border bg-background/40 p-6">
              <h3 className="text-base font-medium">{f.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </Section>
    </PublicLayout>
  );
}
