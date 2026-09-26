import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, audit, maskCode } from "./admin.functions";

const WEB_ID = /^WEB3-[0-9A-F]{8}$/;
const CARD_ID = /^CARD-[0-9A-F]{8}$/;
const ACT_CODE = /^ACT-[0-9A-Z]{4}-[0-9A-Z]{3}$/;

function hex(n: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, n)
    .toUpperCase();
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function uniqueWebId(db: any) {
  for (let i = 0; i < 20; i++) {
    const id = `WEB3-${hex(8)}`;
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("web_id", id);
    if (!count) return id;
  }
  throw new Error("Could not generate a unique Web ID, please retry.");
}

async function uniqueCode(db: any) {
  for (let i = 0; i < 20; i++) {
    const code = `ACT-${hex(4)}-${hex(3)}`;
    const { count } = await db.from("activation_codes").select("id", { count: "exact", head: true }).eq("code", code);
    if (!count) return code;
  }
  throw new Error("Could not generate a unique code, please retry.");
}

export const adminGenerateWebId = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    return { webId: await uniqueWebId(db), code: await uniqueCode(db), cardRef: `CARD-${hex(8)}` };
  });

const createSchema = z.object({
  webId: z.string().trim().toUpperCase().regex(WEB_ID, "Web ID must look like WEB3-XXXXXXXX (hex)"),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  cardRef: z.string().trim().toUpperCase().regex(CARD_ID, "Card ID must look like CARD-XXXXXXXX (hex)"),
  code: z.string().trim().toUpperCase().regex(ACT_CODE, "Activation code must look like ACT-XXXX-XXX"),
  cardStatus: z.enum(["pending_activation", "activation_pending", "active", "suspended"]),
  notes: z.string().max(1000).default(""),
  demo: z.boolean().default(true),
});

export const adminCreateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof createSchema>) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { label } = await assertAdmin(context);
    const db = await admin();
    const [w, c, k] = await Promise.all([
      db.from("profiles").select("id", { count: "exact", head: true }).eq("web_id", data.webId),
      db.from("cards").select("id", { count: "exact", head: true }).eq("card_ref", data.cardRef),
      db.from("activation_codes").select("id", { count: "exact", head: true }).eq("code", data.code),
    ]);
    if (w.count) throw new Error("That Web ID is already in use.");
    if (c.count) throw new Error("That Card ID is already in use.");
    if (k.count) throw new Error("That activation code is already in use.");

    const { data: created, error } = await db.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the login for this customer.");
    const uid = created.user.id;
    const now = new Date().toISOString();

    await db
      .from("profiles")
      .update({ web_id: data.webId, full_name: data.fullName, notes: data.notes, is_demo: data.demo, created_by: label, updated_by: label, updated_at: now } as any)
      .eq("id", uid);
    const { data: card } = await db
      .from("cards")
      .update({
        card_ref: data.cardRef,
        cardholder_name: data.fullName.toUpperCase(),
        status: data.cardStatus,
        activated_at: data.cardStatus === "active" ? now : null,
        updated_at: now,
      } as any)
      .eq("user_id", uid)
      .select("id")
      .single();
    await db.from("activation_codes").update({ code: data.code } as any).eq("user_id", uid);

    await audit({ actorId: context.userId, actorLabel: label, action: "Web ID created", subjectUserId: uid, webId: data.webId, previous: null, next: data.cardStatus });
    await audit({ actorId: context.userId, actorLabel: label, action: "Activation code assigned", subjectUserId: uid, webId: data.webId, previous: null, next: maskCode({ code: data.code }).code });
    return { id: uid, cardId: card?.id };
  });

async function loadAccount(db: any, id: string) {
  const [p, cards, codes, pays, logs] = await Promise.all([
    db.from("profiles").select("*").eq("id", id).maybeSingle(),
    db.from("cards").select("*").eq("user_id", id).order("created_at"),
    db.from("activation_codes").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("payments").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("audit_logs").select("*").eq("subject_user_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  if (!p.data) throw new Error("Account not found");
  return {
    profile: p.data,
    card: cards.data?.[0] ?? null,
    codes: (codes.data ?? []).map((c: any) => maskCode(c)),
    payments: pays.data ?? [],
    history: logs.data ?? [],
  };
}

export const adminGetAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return loadAccount(await admin(), data.id);
  });

export const adminUpdateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; fullName: string; notes: string }) =>
    z.object({ id: z.string().uuid(), fullName: z.string().trim().min(2).max(120), notes: z.string().max(1000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { label } = await assertAdmin(context);
    const db = await admin();
    const { data: before } = await db.from("profiles").select("*").eq("id", data.id).single();
    await db.from("profiles").update({ full_name: data.fullName, notes: data.notes, updated_by: label, updated_at: new Date().toISOString() } as any).eq("id", data.id);
    await audit({ actorId: context.userId, actorLabel: label, action: "Account edited", subjectUserId: data.id, webId: before?.web_id, previous: before?.full_name, next: data.fullName });
    return { ok: true };
  });

export const adminReplaceCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; code?: string }) =>
    z.object({ userId: z.string().uuid(), code: z.string().trim().toUpperCase().regex(ACT_CODE).optional().or(z.literal("")) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { label } = await assertAdmin(context);
    const db = await admin();
    const code = data.code || (await uniqueCode(db));
    const { count } = await db.from("activation_codes").select("id", { count: "exact", head: true }).eq("code", code);
    if (count) throw new Error("That activation code is already in use.");
    const [{ data: card }, { data: p }, { data: old }] = await Promise.all([
      db.from("cards").select("id").eq("user_id", data.userId).order("created_at").limit(1).single(),
      db.from("profiles").select("web_id").eq("id", data.userId).single(),
      db.from("activation_codes").select("code").eq("user_id", data.userId).eq("status", "active").maybeSingle(),
    ]);
    if (!card) throw new Error("This account has no card.");
    await db.from("activation_codes").update({ status: "replaced" } as any).eq("user_id", data.userId).eq("status", "active");
    await db.from("activation_codes").insert({ card_id: card.id, user_id: data.userId, code } as any);
    await audit({ actorId: context.userId, actorLabel: label, action: old ? "Activation code replaced" : "Activation code created", subjectUserId: data.userId, webId: p?.web_id, previous: old ? maskCode(old).code : null, next: maskCode({ code }).code });
    return { ok: true };
  });

export const adminSetCodeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { codeId: string; status: "active" | "disabled" }) =>
    z.object({ codeId: z.string().uuid(), status: z.enum(["active", "disabled"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { label } = await assertAdmin(context);
    const db = await admin();
    const { data: c } = await db.from("activation_codes").select("*").eq("id", data.codeId).single();
    if (!c) throw new Error("Code not found");
    if (data.status === "active") {
      await db.from("activation_codes").update({ status: "disabled" } as any).eq("user_id", c.user_id).eq("status", "active");
    }
    await db.from("activation_codes").update({ status: data.status } as any).eq("id", data.codeId);
    const { data: p } = await db.from("profiles").select("web_id").eq("id", c.user_id).single();
    await audit({ actorId: context.userId, actorLabel: label, action: data.status === "disabled" ? "Activation code disabled" : "Activation code re-enabled", subjectUserId: c.user_id, webId: p?.web_id, previous: (c as any).status, next: data.status });
    return { ok: true };
  });

export const adminRevealCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { codeId: string }) => z.object({ codeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { label } = await assertAdmin(context);
    const db = await admin();
    const { data: c } = await db.from("activation_codes").select("code, user_id").eq("id", data.codeId).single();
    if (!c) throw new Error("Code not found");
    const { data: p } = await db.from("profiles").select("web_id").eq("id", c.user_id).single();
    await audit({ actorId: context.userId, actorLabel: label, action: "Activation code revealed", subjectUserId: c.user_id, webId: p?.web_id });
    return { code: c.code };
  });

export const adminListCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const [codes, profiles, cards] = await Promise.all([
      db.from("activation_codes").select("*").order("created_at", { ascending: false }),
      db.from("profiles").select("id, web_id, full_name"),
      db.from("cards").select("id, card_type, card_ref, status"),
    ]);
    return (codes.data ?? []).map((c: any) => ({
      ...maskCode(c),
      profile: (profiles.data ?? []).find((p: any) => p.id === c.user_id) ?? null,
      card: (cards.data ?? []).find((k: any) => k.id === c.card_id) ?? null,
    }));
  });

export const adminResetWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { label } = await assertAdmin(context);
    const db = await admin();
    const [{ data: card }, { data: p }] = await Promise.all([
      db.from("cards").select("*").eq("user_id", data.userId).order("created_at").limit(1).single(),
      db.from("profiles").select("web_id").eq("id", data.userId).single(),
    ]);
    await db.from("cards").update({ status: "pending_activation", activated_at: null, updated_at: new Date().toISOString() } as any).eq("user_id", data.userId);
    await db.from("activation_codes").update({ verified_at: null } as any).eq("user_id", data.userId).eq("status", "active");
    await audit({ actorId: context.userId, actorLabel: label, action: "Workflow reset", subjectUserId: data.userId, webId: p?.web_id, previous: card?.status, next: "pending_activation" });
    return { ok: true };
  });

export const adminSetDeactivated = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; deactivated: boolean }) =>
    z.object({ userId: z.string().uuid(), deactivated: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { label } = await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot deactivate your own administrator account.");
    const db = await admin();
    const { data: p } = await db.from("profiles").select("web_id").eq("id", data.userId).single();
    await db.from("profiles").update({ deactivated: data.deactivated, updated_by: label, updated_at: new Date().toISOString() } as any).eq("id", data.userId);
    await db.auth.admin.updateUserById(data.userId, { ban_duration: data.deactivated ? "876000h" : "none" });
    await audit({ actorId: context.userId, actorLabel: label, action: data.deactivated ? "Account deactivated" : "Account reactivated", subjectUserId: data.userId, webId: p?.web_id, previous: data.deactivated ? "active" : "deactivated", next: data.deactivated ? "deactivated" : "active" });
    return { ok: true };
  });

