import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export function maskCode<T extends { code: string } | null>(c: T): T {
  if (!c) return c;
  const parts = c.code.split("-");
  return { ...c, code: parts.length === 3 ? `${parts[0]}-••••-${parts[2]}` : "••••••" };
}

export async function assertAdmin(context: {
  supabase: any;
  userId: string;
}): Promise<{ label: string }> {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !isAdmin) throw new Error("Forbidden");
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", context.userId)
    .maybeSingle();
  return { label: profile?.full_name || profile?.email || "administrator" };
}

export async function audit(entry: {
  actorId: string;
  actorLabel: string;
  action: string;
  subjectUserId?: string | null;
  webId?: string | null;
  previous?: string | null;
  next?: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: entry.actorId,
    actor_label: entry.actorLabel,
    action: entry.action,
    subject_user_id: entry.subjectUserId ?? null,
    web_id: entry.webId ?? null,
    previous_state: entry.previous ?? null,
    new_state: entry.next ?? null,
  });
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const [customers, cards, payments, fees, logs] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("cards").select("status"),
      supabase.from("payments").select("status, amount_cents"),
      supabase.from("service_fees").select("id, status"),
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    const cardRows = cards.data ?? [];
    const payRows = payments.data ?? [];
    return {
      customers: customers.count ?? 0,
      cardsActive: cardRows.filter((c) => c.status === "active").length,
      cardsPending: cardRows.filter((c) => c.status === "pending_activation").length,
      cardsSuspended: cardRows.filter((c) => c.status === "suspended").length,
      paymentsPaid: payRows.filter((p) => p.status === "paid").length,
      paymentsPending: payRows.filter((p) => p.status === "payment_pending").length,
      revenueCents: payRows
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.amount_cents, 0),
      activeFees: (fees.data ?? []).filter((f) => f.status === "active").length,
      recentLogs: logs.data ?? [],
    };
  });

export const adminListCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const [profiles, cards, codes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("cards").select("*"),
      supabase.from("activation_codes").select("*"),
    ]);
    return (profiles.data ?? []).map((p) => ({
      ...p,
      card: (cards.data ?? []).find((c) => c.user_id === p.id) ?? null,
      code: maskCode((codes.data ?? []).find((c) => c.user_id === p.id && c.status === "active") ?? null),
    }));
  });

export const adminSetCardStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string; status: string }) =>
    z
      .object({
        cardId: z.string().uuid(),
        status: z.enum(["pending_activation", "activation_pending", "active", "suspended", "expired", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { label } = await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: card } = await supabaseAdmin
      .from("cards")
      .select("*")
      .eq("id", data.cardId)
      .single();

    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "active" && !card.activated_at)
      patch.activated_at = new Date().toISOString();
    patch.updated_at = new Date().toISOString();
    await supabaseAdmin.from("cards").update(patch as any).eq("id", data.cardId);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("web_id")
      .eq("id", card.user_id)
      .maybeSingle();

    await audit({
      actorId: context.userId,
      actorLabel: label,
      action:
        data.status === "active"
          ? "Card activated by administrator"
          : `Card status changed to ${data.status}`,
      subjectUserId: card.user_id,
      webId: profile?.web_id ?? null,
      previous: card.status,
      next: data.status,
    });
    return { ok: true };
  });

export const adminListFees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("service_fees")
      .select("*")
      .order("created_at", { ascending: true });
    return data ?? [];
  });

export const adminSaveFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      description: string;
      amount: number;
      status: string;
    }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          name: z.string().min(2).max(120),
          description: z.string().min(2).max(400),
          amount: z.number().min(0).max(100000),
          status: z.enum(["active", "disabled"]),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { label } = await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      name: data.name,
      description: data.description,
      amount_cents: Math.round(data.amount * 100),
      status: data.status,
    };

    if (data.id) {
      const { data: before } = await supabaseAdmin
        .from("service_fees")
        .select("*")
        .eq("id", data.id)
        .single();
      await supabaseAdmin.from("service_fees").update(payload).eq("id", data.id);
      await audit({
        actorId: context.userId,
        actorLabel: label,
        action: `Service fee updated: ${data.name}`,
        previous: `${before.name} · ${before.amount_cents / 100} · ${before.status}`,
        next: `${data.name} · ${data.amount} · ${data.status}`,
      });
    } else {
      await supabaseAdmin.from("service_fees").insert(payload);
      await audit({
        actorId: context.userId,
        actorLabel: label,
        action: `Service fee created: ${data.name}`,
        previous: null,
        next: `${data.name} · ${data.amount} · ${data.status}`,
      });
    }
    return { ok: true };
  });

export const adminDeleteFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { label } = await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin
      .from("service_fees")
      .select("*")
      .eq("id", data.id)
      .single();
    const { count } = await supabaseAdmin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("service_fee_id", data.id);
    if ((count ?? 0) > 0)
      throw new Error(
        "This service has payments attached to it, so it can be disabled but not deleted.",
      );
    await supabaseAdmin.from("service_fees").delete().eq("id", data.id);
    await audit({
      actorId: context.userId,
      actorLabel: label,
      action: `Service fee deleted: ${before.name}`,
      previous: `${before.name} · ${before.amount_cents / 100} · ${before.status}`,
      next: "deleted",
    });
    return { ok: true };
  });

export const adminListPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const [payments, profiles] = await Promise.all([
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, web_id, email"),
    ]);
    return (payments.data ?? []).map((p) => ({
      ...p,
      customer: (profiles.data ?? []).find((c) => c.id === p.user_id) ?? null,
    }));
  });

export const adminListAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });
