import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Section, Eyebrow, SectionTitle, Lead } from "@/components/site/Section";
import { Web3Card } from "@/components/brand/Web3Card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/card")({
  head: () => ({
    meta: [
      { title: "The WEB3 Digital Card — WEB3" },
      {
        name: "description",
        content:
          "A premium WEB3 digital card linked to your authenticated Web ID, with clear status, activation date and card-management controls.",
      },
      { property: "og:title", content: "The WEB3 Digital Card — WEB3" },
      {
        property: "og:description",
        content:
          "A premium WEB3 digital card linked to your authenticated Web ID, with clear status and card-management controls.",
      },
    ],
  }),
  component: CardPage,
});

const FACTS = [
  {
    t: "Linked to one Web ID",
    d: "Each card belongs to exactly one authenticated account, so a card cannot be claimed by someone else.",
  },
  {
    t: "Clear status at all times",
    d: "Pending activation, active or suspended — your card page always shows the current state and activation date.",
  },
  {
    t: "No secrets on screen",
    d: "WEB3 never displays private keys, seed phrases or authentication secrets. Only your card record is shown.",
  },
  {
    t: "Managed from your account",
    d: "Once active, your card details and activity live in your account area behind sign-in.",
  },
];

function CardPage() {
  return (
    <PublicLayout>
      <Section className="hero-bg">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>WEB3 Digital Card</Eyebrow>
            <SectionTitle>A premium card record, built around your identity</SectionTitle>
            <Lead>
              The WEB3 digital card is the visual representation of your card record. It
              shows the cardholder name, the last four digits, the expiry and the current
              operational status of the card on your account.
            </Lead>
            <Button asChild size="lg" className="mt-8">
              <Link to="/activate">Activate your card</Link>
            </Button>
          </div>
          <div className="mx-auto w-full max-w-md">
            <Web3Card tilt status="ACTIVE" />
          </div>
        </div>
      </Section>

      <Section className="border-t border-border">
        <div className="grid gap-5 sm:grid-cols-2">
          {FACTS.map((f) => (
            <div key={f.t} className="panel p-6">
              <h3 className="text-base font-medium">{f.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </Section>
    </PublicLayout>
  );
}
