import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/activate")({
  head: () => ({
    meta: [
      { title: "Access your WEB3 card — WEB3" },
      {
        name: "description",
        content:
          "Enter your Web ID to begin activating your WEB3 digital card. Your Web ID identifies your account; you still sign in to access it.",
      },
      { property: "og:title", content: "Access your WEB3 card — WEB3" },
      {
        property: "og:description",
        content: "Enter your Web ID to begin activating your WEB3 digital card.",
      },
    ],
  }),
  component: ActivateEntry,
});

function ActivateEntry() {
  const navigate = useNavigate();
  const [webId, setWebId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = webId.trim().toUpperCase();
    if (!/^WEB3-[A-Z0-9]{6,12}$/.test(value)) {
      setError(
        "That doesn't look like a Web ID. It should look like WEB3-915AA7E3.",
      );
      return;
    }
    setError(null);
    navigate({ to: "/auth", search: { webId: value } });
  }

  return (
    <PublicLayout>
      <div className="hero-bg">
        <div className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="text-xs font-semibold tracking-[0.22em] text-accent">
            CARD ACTIVATION
          </p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
            ACCESS YOUR WEB3 CARD
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Enter the Web ID linked to your card to begin. Your Web ID identifies your
            account — it is not a password, and entering it never reveals account
            information on its own.
          </p>

          <form onSubmit={onSubmit} className="panel mt-8 space-y-5 p-6 sm:p-8">
            <div className="space-y-2">
              <Label htmlFor="webId">Web ID</Label>
              <Input
                id="webId"
                autoFocus
                placeholder="WEB3-915AA7E3"
                value={webId}
                onChange={(e) => setWebId(e.target.value.toUpperCase())}
                className="mono h-12 tracking-[0.12em]"
                aria-invalid={Boolean(error)}
              />
              <p className="text-xs text-muted-foreground">
                Example format: WEB3-915AA7E3
              </p>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="h-12 w-full text-sm tracking-[0.1em]">
              CONTINUE <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <div className="flex gap-3 rounded-lg border border-border bg-background/40 p-4 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <p>
                After this step you sign in to your account. Card details, payment
                information and activation codes are only shown to an authenticated
                account holder.
              </p>
            </div>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Don't have a Web ID yet?{" "}
            <Link to="/auth" className="text-accent underline-offset-4 hover:underline">
              Create an account
            </Link>{" "}
            and one will be issued to you.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
