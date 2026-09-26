import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/useSession";

const searchSchema = z.object({
  webId: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — WEB3 Card Activation" },
      {
        name: "description",
        content:
          "Sign in to your WEB3 account to view your digital card, activation status and service fee payments.",
      },
      { property: "og:title", content: "Sign in — WEB3 Card Activation" },
      {
        property: "og:description",
        content: "Sign in to your WEB3 account to manage your digital card.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice(
            "Check your email to confirm your address. Once confirmed you can sign in and your Web ID will be waiting for you.",
          );
          setMode("signin");
        } else {
          toast.success("Account created");
          navigate({ to: "/dashboard" });
        }
      } else {
        const login = email.includes("@") ? email.trim() : `${email.trim().toLowerCase()}@web3.local`;
        const { data, error } = await supabase.auth.signInWithPassword({ email: login, password });
        if (error) throw error;
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        toast.success("Signed in");
        navigate({ to: roles?.some((r) => r.role === "admin") ? "/admin" : "/dashboard" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(
        message.toLowerCase().includes("invalid login")
          ? "Those sign-in details don't match an account."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicLayout>
      <div className="hero-bg">
        <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6 lg:py-24">
          <p className="text-xs font-semibold tracking-[0.22em] text-accent">
            {mode === "signin" ? "ACCOUNT ACCESS" : "CREATE ACCOUNT"}
          </p>
          <h1 className="mt-4 text-3xl font-semibold">
            {mode === "signin" ? "Sign in to WEB3" : "Create your WEB3 account"}
          </h1>
          {search.webId ? (
            <p className="mono mt-3 text-sm text-muted-foreground">
              Continuing for {search.webId}
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="panel mt-8 space-y-5 p-6 sm:p-8">
            {mode === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Morgan"
                  required
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">{mode === "signin" ? "Email or username" : "Email"}</Label>
              <Input
                id="email"
                type={mode === "signin" ? "text" : "email"}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {mode === "signup" ? (
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              ) : null}
            </div>

            {notice ? (
              <p className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-muted-foreground">
                {notice}
              </p>
            ) : null}

            <Button type="submit" disabled={busy} className="h-11 w-full">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {mode === "signin" ? "No account yet?" : "Already registered?"}{" "}
              <button
                type="button"
                className="text-accent underline-offset-4 hover:underline"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </p>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            WEB3 will never ask for your password outside this page.{" "}
            <Link to="/security" className="underline underline-offset-4">
              Read our security notes
            </Link>
            .
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
