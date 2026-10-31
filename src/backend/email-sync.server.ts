// Prototype message watcher: reads mock Outlook emails and Teams channel messages stored in the
// database (no live Microsoft connection) and turns product changes into reviewable proposals.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { AiGatewayError, extractEmailChanges } from "./ai.server";
import { findOrCreateProduct, insertChange } from "./ingest.server";
import { normalizeChangeType, normalizeDate, normalizeVersion } from "./kb-rules";

type Client = SupabaseClient<Database>;
type MessageRow = Database["public"]["Tables"]["emails"]["Row"];
const BATCH = 5;

// Every change the AI finds is saved to the knowledge base right away and listed under
// "AI findings", where a person can undo it.
async function processMessage(db: Client, row: MessageRow) {
  await db.from("emails").update({ status: "processing", error: null }).eq("id", row.id);
  const { data: products } = await db.from("products").select("name");
  const source = row.channel === "teams" ? `Microsoft Teams, #${row.channel_name ?? "channel"}` : "Outlook email";
  const result = await extractEmailChanges(
    {
      subject: row.subject ?? `(${source})`,
      from: `${row.from_address ?? "unknown"} via ${source}`,
      date: row.received_at ?? row.created_at,
      body: row.body ?? row.snippet ?? "",
    },
    products?.map((p) => p.name) ?? [],
  );

  if (result.is_product_update) {
    for (const c of result.changes) {
      if (!c.product_name?.trim() || !c.summary?.trim()) continue;
      const confidence = Math.max(0, Math.min(1, c.confidence));
      const { data: proposal, error } = await db
        .from("email_change_proposals")
        .insert({
          email_id: row.id,
          product_name: c.product_name.trim(),
          product_description: c.product_description,
          version: normalizeVersion(c.version),
          change_date: normalizeDate(c.date),
          change_type: normalizeChangeType(c.type),
          summary: c.summary.trim(),
          confidence,
        })
        .select("*")
        .single();
      if (error) throw error;
      await applyProposalRow(db, proposal, null);
    }
  }
  await db.from("emails").update({ status: result.is_product_update ? "processed" : "ignored" }).eq("id", row.id);
}

export async function applyProposalRow(
  db: Client,
  p: Database["public"]["Tables"]["email_change_proposals"]["Row"],
  reviewer: string | null,
) {
  const productId = await findOrCreateProduct(db, p.product_name, { description: p.product_description });
  const changeId = await insertChange(
    db,
    productId,
    { version: p.version, date: p.change_date, type: p.change_type, summary: p.summary },
    { emailId: p.email_id },
  );
  await db
    .from("email_change_proposals")
    .update({ status: "applied", applied_change_id: changeId, reviewed_by: reviewer })
    .eq("id", p.id);
}

export type SyncResult = { status: string; processed?: number; message?: string };

/** One bounded, single-flight run over unread mock messages. */
export async function runMessageSync(db: Client, onlyId?: string): Promise<SyncResult> {
  const { data: state } = await db.from("email_sync_state").select("*").eq("id", 1).single();
  if (!state) return { status: "error", message: "Sync state missing" };
  if (!state.enabled) return { status: "disabled", message: "Message reading is turned off." };
  if (state.paused_reason) return { status: "paused", message: state.paused_reason };

  const now = new Date();
  const { data: locked } = await db
    .from("email_sync_state")
    .update({ lock_until: new Date(now.getTime() + 5 * 60_000).toISOString() })
    .eq("id", 1)
    .or(`lock_until.is.null,lock_until.lt.${now.toISOString()}`)
    .select("id");
  if (!locked?.length) return { status: "busy", message: "Messages are already being read. Try again shortly." };

  let processed = 0;
  try {
    let q = db.from("emails").select("*").in("status", ["pending", "processing"]).order("received_at").limit(BATCH);
    if (onlyId) q = q.eq("id", onlyId);
    const { data: pending } = await q;
    for (const row of pending ?? []) {
      try {
        await processMessage(db, row);
        processed++;
      } catch (e) {
        if (e instanceof AiGatewayError && e.isBlocking) throw e;
        const message = e instanceof Error ? e.message : String(e);
        await db.from("emails").update({ status: "failed", error: message.slice(0, 1000) }).eq("id", row.id);
      }
    }
    await db
      .from("email_sync_state")
      .update({ last_run_at: new Date().toISOString(), last_error: null, lock_until: null })
      .eq("id", 1);
    return { status: "ok", processed };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const pause = e instanceof AiGatewayError && e.isBlocking ? `AI paused: ${message.slice(0, 300)}` : null;
    await db
      .from("email_sync_state")
      .update({
        last_run_at: new Date().toISOString(),
        last_error: message.slice(0, 1000),
        lock_until: null,
        ...(pause ? { paused_reason: pause } : {}),
      })
      .eq("id", 1);
    return { status: pause ? "paused" : "error", processed, message };
  }
}
