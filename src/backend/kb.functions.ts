import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEMO_EMAIL = "demo@ledger-demo.example";

/** The shared demo account may not change who is on the team or send real invitations. */
function assertNotDemo(claims: { email?: string } | undefined) {
  if (claims?.email === DEMO_EMAIL) throw new Error("Team changes are turned off for the demo account.");
}

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Only admins can do this.");
}

export const processDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { documentId: string }) => z.object({ documentId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { processStoredDocument } = await import("./ingest.server");
    try {
      return { ok: true as const, ...(await processStoredDocument(context.supabase, data.documentId)) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  });

export const searchKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { query: string }) => z.object({ query: z.string().min(1).max(500) }).parse(i))
  .handler(async ({ data, context }) => {
    const { searchSources } = await import("./search.server");
    return searchSources(context.supabase, data.query, { documents: 10, messages: 6, changes: 6 });
  });

export const askKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { question: string }) => z.object({ question: z.string().min(1).max(1000) }).parse(i))
  .handler(async ({ data, context }) => {
    const { answerQuestion, AiGatewayError } = await import("./ai.server");
    const { searchSources } = await import("./search.server");
    try {
      const hits = await searchSources(context.supabase, data.question, { documents: 8, messages: 5, changes: 8 });
      const sources = hits.map((h, i) => ({ ...h, n: i + 1 }));
      const context_ = sources
        .map((s) =>
          s.kind === "message"
            ? `[${s.n}] ${s.channel === "teams" ? "Teams message in" : "Outlook email:"} ${s.title} (from ${s.from ?? "unknown"}, ${s.date?.slice(0, 10) ?? "undated"})\n${s.content}`
            : s.kind === "change"
              ? `[${s.n}] Past change (${s.changeType}) to ${s.title}, ${s.date ?? "undated"}\n${s.content}`
              : `[${s.n}] Document: ${s.title}${s.renewalDue ? ` (OUTDATED: renewal was due ${s.renewalDue})` : ""}\n${s.content}`,
        )
        .join("\n\n");
      const answer = await answerQuestion(data.question, context_ || "(no documents, messages or past changes yet)");
      return {
        answer,
        sources: sources.map(({ content, ...s }) => ({ ...s, excerpt: content.slice(0, 220) })),
      };
    } catch (e) {
      if (e instanceof AiGatewayError && e.status === 402)
        return { error: "AI credits have run out. Add credits in workspace settings to continue." };
      if (e instanceof AiGatewayError && e.status === 429)
        return { error: "Too many AI requests right now. Please try again in a minute." };
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profiles } = await context.supabase.from("profiles").select("*").order("created_at");
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return {
      me: context.userId,
      isAdmin: !!isAdmin,
      members: (profiles ?? []).map((p) => ({
        ...p,
        isAdmin: (roles ?? []).some((r) => r.user_id === p.id && r.role === "admin"),
      })),
    };
  });

export const setAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; admin: boolean }) =>
    z.object({ userId: z.string().uuid(), admin: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context.claims as { email?: string });
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && !data.admin) throw new Error("You can't remove your own admin role.");
    if (data.admin) {
      await context.supabase.from("user_roles").upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      await context.supabase.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    }
    return { ok: true };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { email: string; redirectTo: string }) =>
    z.object({ email: z.string().email(), redirectTo: z.string().url() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context.claims as { email?: string });
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: data.redirectTo });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    assertNotDemo(context.claims as { email?: string });
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("You can't remove yourself.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getEmailStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: state } = await context.supabase.from("email_sync_state").select("*").eq("id", 1).single();
    return { state };
  });

/** Reads unread mock Outlook/Teams messages. Any signed-in team member may trigger it. */
export const runEmailSyncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runMessageSync } = await import("./email-sync.server");
    return runMessageSync(supabaseAdmin);
  });

/** Prototype only: posts a simulated Outlook email or Teams message, then lets the AI read it. */
export const sendMockMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { channel: "outlook" | "teams"; from: string; subject?: string; channelName?: string; body: string }) =>
    z
      .object({
        channel: z.enum(["outlook", "teams"]),
        from: z.string().min(1).max(200),
        subject: z.string().max(300).optional(),
        channelName: z.string().max(100).optional(),
        body: z.string().min(1).max(10000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("emails")
      .insert({
        channel: data.channel,
        from_address: data.from,
        subject: data.channel === "outlook" ? (data.subject ?? "(no subject)") : null,
        channel_name: data.channel === "teams" ? (data.channelName ?? "General") : "Inbox",
        to_address: data.channel === "outlook" ? "product-team@contoso-demo.com" : null,
        body: data.body,
        received_at: new Date().toISOString(),
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runMessageSync } = await import("./email-sync.server");
    return runMessageSync(supabaseAdmin, row.id);
  });

export const updateEmailSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { enabled?: boolean; resume?: boolean }) =>
    z
      .object({
        enabled: z.boolean().optional(),
        resume: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch: { enabled?: boolean; paused_reason?: null } = {};
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.resume) patch.paused_reason = null;
    const { error } = await context.supabase
      .from("email_sync_state")
      .update(patch)
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviewProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; action: "apply" | "reject" | "undo"; summary?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["apply", "reject", "undo"]),
        summary: z.string().min(1).max(2000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: p, error } = await db.from("email_change_proposals").select("*").eq("id", data.id).single();
    if (error || !p) throw new Error("Change not found");
    if (data.action === "apply") {
      const { applyProposalRow } = await import("./email-sync.server");
      await applyProposalRow(db, data.summary ? { ...p, summary: data.summary } : p, context.userId);
    } else if (data.action === "reject") {
      await db.from("email_change_proposals").update({ status: "rejected", reviewed_by: context.userId }).eq("id", p.id);
    } else {
      if (p.applied_change_id) await db.from("change_entries").delete().eq("id", p.applied_change_id);
      await db
        .from("email_change_proposals")
        .update({ status: "pending", applied_change_id: null, reviewed_by: context.userId })
        .eq("id", p.id);
    }
    return { ok: true };
  });
