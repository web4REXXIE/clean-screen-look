import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  KeyRound,
  CreditCard,
  Receipt,
  BadgeDollarSign,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/customers", label: "Customer Records & Web IDs", icon: Users },
  { to: "/admin/codes", label: "Activation Codes", icon: KeyRound },
  { to: "/admin/cards", label: "Card Status", icon: CreditCard },
  { to: "/admin/fees", label: "Service Fees", icon: BadgeDollarSign },
  { to: "/admin/payments", label: "Payments / Test Transactions", icon: Receipt },
  { to: "/admin/audit", label: "Audit Logs", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: "exact" in n }}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          activeProps={{ className: "bg-secondary text-foreground" }}
        >
          <n.icon className="h-4 w-4" />
          {n.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-40 flex h-14 items-center justify-between px-4 lg:hidden">
        <Link to="/admin"><Logo /></Link>
        <button aria-label="Menu" onClick={() => setOpen((v) => !v)} className="rounded-md border border-border p-2">
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </header>
      {open ? <div className="border-b border-border bg-surface p-4 lg:hidden">{nav}<Button variant="outline" className="mt-4 w-full" onClick={signOut}>Sign out</Button></div> : null}
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface p-4 lg:flex">
          <Link to="/admin" className="mb-2 px-2"><Logo /></Link>
          <p className="mb-6 px-2 text-[10px] font-semibold tracking-[0.22em] text-accent">ADMIN CONTROL CENTER</p>
          {nav}
          <div className="mt-auto space-y-2">
            <Link to="/" className="block px-3 text-xs text-muted-foreground hover:text-foreground">View public site</Link>
            <Button variant="outline" className="w-full" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-warning">TEST / DEMO ENVIRONMENT</span> — records and amounts here are for card-activation service management only. No balances or customer funds are held or released.
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

const TONE: Record<string, string> = {
  active: "border-success/40 bg-success/10 text-success",
  paid: "border-success/40 bg-success/10 text-success",
  completed: "border-success/40 bg-success/10 text-success",
  suspended: "border-destructive/40 bg-destructive/10 text-destructive",
  cancelled: "border-destructive/40 bg-destructive/10 text-destructive",
  payment_failed: "border-destructive/40 bg-destructive/10 text-destructive",
  disabled: "border-border bg-secondary text-muted-foreground",
  replaced: "border-border bg-secondary text-muted-foreground",
  expired: "border-border bg-secondary text-muted-foreground",
  deactivated: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", TONE[value] ?? "border-warning/40 bg-warning/10 text-warning")}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function Confirm({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel = "Confirm change",
  onConfirm,
  destructive,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild><div className="space-y-1 text-sm">{children}</div></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function activationStatus(card: any, code: any) {
  if (card?.status === "active" && card?.activated_at) return "completed";
  if (code?.verified_at || card?.status === "activation_pending") return "pending";
  return "not_started";
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="panel p-10 text-center text-sm text-muted-foreground">{children}</div>;
}
