import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function hex(len: number) {
  let out = "";
  const chars = "0123456789ABCDEF";
  for (let i = 0; i < len; i += 1)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** Everything the signed-in customer is allowed to see about their own account. */
export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, cardRes, codeRes, paymentsRes, feeRes, rolesRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase
          .from("cards")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("activation_codes")
          .select("id, card_id, verified_at, created_at")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("payments")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("service_fees")
          .select("*")
          .eq("status", "active")
          .order("effective_date", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

    const payments = paymentsRes.data ?? [];
    return {
      profile: profileRes.data,
      card: cardRes.data,
      codeVerified: Boolean(codeRes.data?.verified_at),
      codeVerifiedAt: codeRes.data?.verified_at ?? null,
      payments,
      paidPayment: payments.find((p) => p.status === "paid") ?? null,
      activeFee: feeRes.data,
      isAdmin: (rolesRes.data ?? []).some((r) => r.role === "admin"),
    };
  });

/** Verifies the activation code issued with the customer's own card. */
export const verifyActivationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) =>
    z.object({ code: z.string().min(4).max(40) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const code = data.code.trim().toUpperCase();

    const { data: card } = await supabase
      .from("cards")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (!card) return { ok: false as const, message: "No card record found on this account." };
    if (card.status === "suspended")
      return { ok: false as const, message: "This card is suspended. Please contact support." };
    if (card.status === "active")
      return { ok: false as const, message: "This card has already been activated." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("activation_codes")
      .select("id, verified_at")
      .eq("user_id", userId)
      .eq("code", code)
      .maybeSingle();

    if (!row) {
      await supabaseAdmin.from("audit_logs").insert({
        actor_id: userId,
        actor_label: "customer",
        action: "Activation code rejected",
        subject_user_id: userId,
        previous_state: "unverified",
        new_state: "unverified",
      });
      return {
        ok: false as const,
        message: "That activation code is not valid for this account.",
      };
    }

    if (!row.verified_at) {
      await supabaseAdmin
        .from("activation_codes")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", row.id);
      await supabaseAdmin.from("audit_logs").insert({
        actor_id: userId,
        actor_label: "customer",
        action: "Activation code verified",
        subject_user_id: userId,
        previous_state: "unverified",
        new_state: "verified",
      });
    }

    return { ok: true as const, message: "Activation code verified." };
  });

/** Creates a payment record and a hosted checkout session with the payment provider. */
export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { origin: string }) =>
    z.object({ origin: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const secretKey = process.env["STRIPE_SECRET_KEY"];

    const { data: card } = await supabase
      .from("cards")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (!card) throw new Error("No card record found on this account.");
    if (card.status === "active") throw new Error("This card is already activated.");

    const { data: code } = await supabase
      .from("activation_codes")
      .select("verified_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!code?.verified_at)
      throw new Error("Verify your activation code before paying the service fee.");

    const { data: fee } = await supabase
      .from("service_fees")
      .select("*")
      .eq("status", "active")
      .order("effective_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!fee) throw new Error("No activation service is currently available.");

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, web_id")
      .eq("id", userId)
      .maybeSingle();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existingPaid } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "paid")
      .maybeSingle();
    if (existingPaid)
      throw new Error("The activation service fee has already been paid on this account.");

    const reference = `WEB3-PAY-${hex(8)}`;
    const { data: payment, error: payErr } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        card_id: card.id,
        service_fee_id: fee.id,
        service_name: fee.name,
        reference,
        amount_cents: fee.amount_cents,
        currency: fee.currency,
        provider: "stripe",
        status: "payment_pending",
      })
      .select()
      .single();
    if (payErr) throw new Error("Could not start checkout. Please try again.");

    if (!secretKey) {
      return {
        ok: false as const,
        reference,
        message:
          "Secure checkout is not connected yet. Your payment request has been recorded as pending.",
      };
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: payment.id,
      customer_email: profile?.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: fee.currency.toLowerCase(),
            unit_amount: fee.amount_cents,
            product_data: {
              name: fee.name,
              description: fee.description,
            },
          },
        },
      ],
      metadata: {
        payment_id: payment.id,
        user_id: userId,
        web_id: profile?.web_id ?? "",
        reference,
      },
      success_url: `${data.origin}/activation?payment=submitted&ref=${reference}`,
      cancel_url: `${data.origin}/activation?payment=cancelled&ref=${reference}`,
    });

    await supabaseAdmin
      .from("payments")
      .update({ provider_session_id: session.id })
      .eq("id", payment.id);

    return { ok: true as const, url: session.url, reference };
  });

/** Re-reads payment state from the provider (used by the "refresh status" button). */
export const refreshPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const secretKey = process.env["STRIPE_SECRET_KEY"];

    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payment) return { status: null as string | null };
    if (payment.status === "paid" || !secretKey || !payment.provider_session_id)
      return { status: payment.status };

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(payment.provider_session_id);

    if (session.payment_status === "paid") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", payment.id)
        .neq("status", "paid");
      await supabaseAdmin.from("audit_logs").insert({
        actor_label: "payment provider",
        action: "Payment confirmed",
        subject_user_id: userId,
        previous_state: payment.status,
        new_state: "paid",
      });
      return { status: "paid" };
    }

    return { status: payment.status };
  });

/** Final step: activates the card once the code is verified and the fee is confirmed paid. */
export const activateMyCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;

    const { data: card } = await supabase
      .from("cards")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!card) throw new Error("No card record found on this account.");
    if (card.status === "active")
      return { ok: true as const, alreadyActive: true, activatedAt: card.activated_at };
    if (card.status === "suspended")
      throw new Error("This card is suspended and cannot be activated.");

    const { data: code } = await supabase
      .from("activation_codes")
      .select("verified_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!code?.verified_at) throw new Error("Your activation code has not been verified.");

    const { data: paid } = await supabase
      .from("payments")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "paid")
      .maybeSingle();
    if (!paid)
      throw new Error("The activation service fee has not been confirmed as paid yet.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const activatedAt = new Date().toISOString();
    await supabaseAdmin
      .from("cards")
      .update({ status: "active", activated_at: activatedAt })
      .eq("id", card.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("web_id")
      .eq("id", userId)
      .maybeSingle();

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: userId,
      actor_label: "customer",
      action: "Card activated",
      subject_user_id: userId,
      web_id: profile?.web_id ?? null,
      previous_state: "pending_activation",
      new_state: "active",
    });

    return { ok: true as const, alreadyActive: false, activatedAt };
  });

/** Public: looks up nothing private — only tells the visitor the Web ID format is valid. */
export const checkWebIdFormat = createServerFn({ method: "POST" })
  .inputValidator((input: { webId: string }) =>
    z.object({ webId: z.string().min(3).max(40) }).parse(input),
  )
  .handler(async ({ data }) => {
    const value = data.webId.trim().toUpperCase();
    const valid = /^WEB3-[A-Z0-9]{6,12}$/.test(value);
    return { valid, webId: value };
  });
