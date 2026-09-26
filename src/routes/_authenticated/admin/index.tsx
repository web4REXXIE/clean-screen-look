import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { adminOverview } from "@/lib/admin.functions";
import { PageHeader } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { dateTime, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Overview });

function Overview() {
  const fn = useServerFn(adminOverview);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "overview"], queryFn: () => fn(), refetchInterval: 15000 });
  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  if (error || !data) return <p className="text-sm text-destructive">Could not load the overview.</p>;
  const stats = [
    ["Customer records", data.customers],
    ["Active cards", data.cardsActive],
    ["Pending activation", data.cardsPending],
    ["Suspended cards", data.cardsSuspended],
    ["Paid service fees", data.paymentsPaid],
    ["Payments pending", data.paymentsPending],
    ["Service fee revenue (test)", money(data.revenueCents)],
    ["Active fee types", data.activeFees],
  ] as const;
  return (
    <>
      <PageHeader
        title="Overview"
        description="Activity across Web IDs, cards and service-fee payments."
        action={<Button asChild><Link to="/admin/customers" search={{ create: true }}>+ Create Web ID</Link></Button>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([l, v]) => (
          <div key={l} className="panel p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="mt-2 text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-sm font-semibold tracking-wide text-muted-foreground">RECENT AUDIT EVENTS</h2>
      <div className="panel divide-y divide-border">
        {data.recentLogs.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No events yet.</p> : null}
        {data.recentLogs.map((l: any) => (
          <div key={l.id} className="flex flex-col gap-1 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span>{l.action} <span className="mono text-muted-foreground">{l.web_id ?? ""}</span></span>
            <span className="text-xs text-muted-foreground">{l.actor_label} · {dateTime(l.created_at)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
