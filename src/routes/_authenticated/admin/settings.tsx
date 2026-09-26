import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: Settings });

function Settings() {
  const items = [
    ["Environment", "TEST / DEMO — records are clearly labelled and hold no customer funds."],
    ["Administrator sign-in", "Username + password. Admin pages re-check the administrator role on the server for every action."],
    ["Web ID policy", "Format WEB3-XXXXXXXX, unique per account. A Web ID is an identifier only and never unlocks private data on its own."],
    ["Activation codes", "Format ACT-XXXX-XXX, unique, masked in lists; reveals are audit-logged."],
    ["Payments", "Status is confirmed only by the payment provider. Card payments go live once a Stripe key is connected."],
    ["Audit log", "Immutable — no edit or delete access for anyone."],
  ];
  return (
    <>
      <PageHeader title="Settings" description="Current platform configuration." />
      <div className="panel divide-y divide-border">
        {items.map(([k, v]) => (
          <div key={k} className="grid gap-1 p-4 sm:grid-cols-3">
            <span className="text-sm font-medium">{k}</span>
            <span className="text-sm text-muted-foreground sm:col-span-2">{v}</span>
          </div>
        ))}
      </div>
    </>
  );
}
