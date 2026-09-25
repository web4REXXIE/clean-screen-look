import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Section, Eyebrow, SectionTitle, Lead } from "@/components/site/Section";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — WEB3 Card Activation" },
      {
        name: "description",
        content:
          "Get help with your Web ID, activation code, service fee payment or card status.",
      },
      { property: "og:title", content: "Support — WEB3 Card Activation" },
      {
        property: "og:description",
        content:
          "Get help with your Web ID, activation code, service fee payment or card status.",
      },
    ],
  }),
  component: SupportPage,
});

const TOPICS = [
  {
    t: "I don't know my Web ID",
    d: "Your Web ID is shown in your account after signing in, and on the documentation issued with your card.",
  },
  {
    t: "My activation code is not accepted",
    d: "Check for typing errors first. Codes look like ACT-7845-9K2. If it still fails, the code may belong to a different account.",
  },
  {
    t: "I paid but my card is still pending",
    d: "Payments are confirmed by the payment provider, which can take a short time. Your payment reference is on your account page.",
  },
  {
    t: "My card is suspended",
    d: "A suspended card cannot be activated. Contact support with your Web ID so the record can be reviewed.",
  },
];

function SupportPage() {
  return (
    <PublicLayout>
      <Section className="hero-bg">
        <Eyebrow>Support</Eyebrow>
        <SectionTitle>Help with your card activation</SectionTitle>
        <Lead>
          Most questions are covered below. When you contact support, always include your
          Web ID and, if relevant, your payment reference — never your password.
        </Lead>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {TOPICS.map((t) => (
            <div key={t.t} className="panel p-6">
              <h3 className="text-base font-medium">{t.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 panel p-6 sm:p-8">
          <h3 className="text-lg font-medium">Contact a support agent</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A support contact address has not been published yet. Once you provide one it
            will appear here and in the footer, so customers can reach a real person.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/activate">Continue activation</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/how-it-works">Read the activation guide</Link>
            </Button>
          </div>
        </div>
      </Section>
    </PublicLayout>
  );
}
