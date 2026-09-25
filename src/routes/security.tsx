import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, UserCheck, FileLock2, Receipt } from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Section, Eyebrow, SectionTitle, Lead } from "@/components/site/Section";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — WEB3 Card Activation" },
      {
        name: "description",
        content:
          "How WEB3 protects card records: authenticated access, account isolation, server-side authorization and an auditable activation history.",
      },
      { property: "og:title", content: "Security — WEB3 Card Activation" },
      {
        property: "og:description",
        content:
          "Authenticated access, account isolation, server-side authorization and an auditable activation history.",
      },
    ],
  }),
  component: SecurityPage,
});

const ITEMS = [
  {
    icon: KeyRound,
    t: "A Web ID is not a password",
    d: "Your Web ID identifies your account, nothing more. Entering it never reveals private account information — you must sign in first.",
  },
  {
    icon: UserCheck,
    t: "Account isolation",
    d: "Every Web ID maps to exactly one account, and each account can only ever read its own card, codes and payments.",
  },
  {
    icon: FileLock2,
    t: "Server-side authorization",
    d: "Permission checks run on the server, not in your browser. Administrator areas use separate role-based access that customers can never reach.",
  },
  {
    icon: Receipt,
    t: "Payments confirmed by the provider",
    d: "A payment is only ever marked as received when the payment provider confirms it. Nothing in the browser can mark a payment successful.",
  },
];

function SecurityPage() {
  return (
    <PublicLayout>
      <Section className="hero-bg">
        <Eyebrow>Security</Eyebrow>
        <SectionTitle>Protecting your card record</SectionTitle>
        <Lead>
          WEB3 handles card records and identity links, so access control is the core of
          the product. Below is exactly how access is granted and what is never exposed.
        </Lead>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {ITEMS.map((i) => (
            <div key={i.t} className="panel p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <i.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-medium">{i.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{i.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 panel p-6">
          <h3 className="text-base font-medium">What WEB3 will never ask you for</h3>
          <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>• Your private keys or seed phrase</li>
            <li>• Your password, over any channel</li>
            <li>• A payment to release or unlock funds</li>
            <li>• A transfer to a personal wallet address</li>
          </ul>
        </div>
      </Section>
    </PublicLayout>
  );
}
