import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretKey = process.env["STRIPE_SECRET_KEY"];
        const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secretKey || !webhookSecret) {
          return new Response("Payment provider not configured", { status: 503 });
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });

        const body = await request.text();
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(secretKey);

        let event: import("stripe").Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            webhookSecret,
          );
        } catch (err) {
          console.error("Webhook signature verification failed", err);
          return new Response("Invalid signature", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        async function setStatus(
          paymentId: string | null | undefined,
          sessionId: string | null | undefined,
          status: "paid" | "payment_failed" | "refunded",
        ) {
          const query = supabaseAdmin.from("payments").select("*").limit(1);
          const { data: payment } = paymentId
            ? await query.eq("id", paymentId).maybeSingle()
            : await query.eq("provider_session_id", sessionId ?? "").maybeSingle();
          if (!payment || payment.status === status) return;

          await supabaseAdmin
            .from("payments")
            .update({
              status,
              paid_at: status === "paid" ? new Date().toISOString() : payment.paid_at,
            })
            .eq("id", payment.id);

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("web_id")
            .eq("id", payment.user_id)
            .maybeSingle();

          await supabaseAdmin.from("audit_logs").insert({
            actor_label: "payment provider",
            action:
              status === "paid"
                ? "Payment confirmed by provider"
                : status === "refunded"
                  ? "Payment refunded by provider"
                  : "Payment failed at provider",
            subject_user_id: payment.user_id,
            web_id: profile?.web_id ?? null,
            previous_state: payment.status,
            new_state: status,
          });
        }

        switch (event.type) {
          case "checkout.session.completed":
          case "checkout.session.async_payment_succeeded": {
            const session = event.data.object;
            if (session.payment_status === "paid") {
              await setStatus(
                session.metadata?.["payment_id"] ?? session.client_reference_id,
                session.id,
                "paid",
              );
            }
            break;
          }
          case "checkout.session.async_payment_failed":
          case "checkout.session.expired": {
            const session = event.data.object;
            await setStatus(
              session.metadata?.["payment_id"] ?? session.client_reference_id,
              session.id,
              "payment_failed",
            );
            break;
          }
          case "charge.refunded": {
            const charge = event.data.object;
            await setStatus(null, String(charge.payment_intent ?? ""), "refunded");
            break;
          }
          default:
            break;
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
