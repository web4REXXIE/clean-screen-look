import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { adminListPayments } from "@/lib/admin.functions";
import { Empty, PageHeader, StatusBadge } from "@/components/admin/AdminShell";
import { dateTime, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/payments")({ component: Payments });

function Payments() {
  const fn = useServerFn(adminListPayments);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "payments"], queryFn: () => fn() });
  return (
    <>
      <PageHeader title="Payments / Test Transactions" description="Status is set only by the payment provider's confirmation. There is no manual 'mark paid' — refunds are issued through the provider." />
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : !data?.length ? <Empty>No payments yet.</Empty> : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr className="border-b border-border">{["Reference", "Customer", "Service", "Amount", "Status", "Created", "Paid"].map((h) => <th key={h} className="whitespace-nowrap p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {data.map((p: any) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="mono whitespace-nowrap p-3">{p.reference}</td>
                  <td className="p-3">{p.customer?.full_name}<div className="mono text-xs text-muted-foreground">{p.customer?.web_id}</div></td>
                  <td className="p-3">{p.service_name}</td>
                  <td className="whitespace-nowrap p-3">{money(p.amount_cents, p.currency)}</td>
                  <td className="p-3"><StatusBadge value={p.status} /></td>
                  <td className="whitespace-nowrap p-3 text-xs">{dateTime(p.created_at)}</td>
                  <td className="whitespace-nowrap p-3 text-xs">{dateTime(p.paid_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
