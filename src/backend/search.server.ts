// Shared retrieval over uploaded documents, Outlook/Teams messages and past changes for Search and Ask AI.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { embedTexts } from "./ai.server";
import { renewalStatus } from "./kb-rules";

type Client = SupabaseClient<Database>;

export type KnowledgeHit = {
  id: string;
  kind: "document" | "message" | "change";
  title: string;
  content: string;
  similarity: number;
  channel?: "outlook" | "teams";
  from?: string | null;
  date?: string | null;
  changeType?: string;
  /** Set for documents whose renewal date has passed (YYYY-MM-DD it was due). */
  renewalDue?: string;
};

type MessageLike = {
  channel: string;
  channel_name: string | null;
  subject: string | null;
  from_address: string | null;
  received_at: string | null;
  body?: string | null;
  snippet?: string | null;
};

export function messageTitle(m: MessageLike) {
  return m.channel === "teams"
    ? `#${m.channel_name ?? "channel"}`
    : m.subject?.trim() || "(no subject)";
}

function messageEmbedText(m: MessageLike) {
  return [
    m.channel === "teams" ? `Microsoft Teams message in #${m.channel_name ?? "channel"}` : "Outlook email",
    m.from_address ? `From: ${m.from_address}` : "",
    m.received_at ? `Date: ${m.received_at.slice(0, 10)}` : "",
    m.subject ? `Subject: ${m.subject}` : "",
    "",
    (m.body ?? m.snippet ?? "").slice(0, 8000),
  ]
    .filter((l, i) => l || i === 4)
    .join("\n");
}

/** Embeds messages that have no embedding yet (bounded per call). Uses the admin client: team members cannot update messages. */
export async function ensureMessageEmbeddings(limit = 64) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("emails")
    .select("id, channel, channel_name, subject, from_address, received_at, body, snippet")
    .is("embedding", null)
    .order("received_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const todo = (rows ?? []).filter((r) => (r.body ?? r.snippet ?? "").trim());
  if (!todo.length) return 0;
  const vectors = await embedTexts(todo.map(messageEmbedText));
  for (const [i, row] of todo.entries()) {
    await supabaseAdmin.from("emails").update({ embedding: JSON.stringify(vectors[i]) }).eq("id", row.id);
  }
  return todo.length;
}

function changeTitle(c: { item_name: string | null; version: string | null }) {
  return [c.item_name ?? "Item", c.version].filter(Boolean).join(" ");
}

/** Embeds past change entries that have no embedding yet (bounded per call). Admin client: team members cannot update them. */
export async function ensureChangeEmbeddings(limit = 128) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("change_entries")
    .select("id, summary, version, change_date, change_type, products(name)")
    .is("embedding", null)
    .limit(limit);
  if (error) throw new Error(error.message);
  const todo = (rows ?? []).filter((r) => r.summary?.trim());
  if (!todo.length) return 0;
  const texts = todo.map((r) => {
    const name = (r.products as { name: string } | null)?.name ?? "Item";
    return `Past change (${r.change_type}) to ${changeTitle({ item_name: name, version: r.version })}` +
      `${r.change_date ? ` on ${r.change_date}` : ""}: ${r.summary}`;
  });
  const vectors = await embedTexts(texts);
  for (const [i, row] of todo.entries()) {
    await supabaseAdmin.from("change_entries").update({ embedding: JSON.stringify(vectors[i]) }).eq("id", row.id);
  }
  return todo.length;
}

/** Finds the closest document passages and messages for one query. */
export async function searchSources(
  db: Client,
  query: string,
  counts: { documents: number; messages: number; changes: number },
): Promise<KnowledgeHit[]> {
  await Promise.all([ensureMessageEmbeddings(), ensureChangeEmbeddings()]);
  const [vec] = await embedTexts([query]);
  const embedding = JSON.stringify(vec);
  const [docRes, msgRes, chgRes] = await Promise.all([
    db.rpc("match_document_chunks", { query_embedding: embedding, match_count: counts.documents }),
    db.rpc("match_messages", { query_embedding: embedding, match_count: counts.messages }),
    db.rpc("match_change_entries", { query_embedding: embedding, match_count: counts.changes }),
  ]);
  if (docRes.error) throw new Error(docRes.error.message);
  if (msgRes.error) throw new Error(msgRes.error.message);
  if (chgRes.error) throw new Error(chgRes.error.message);

  const ids = [...new Set((docRes.data ?? []).map((m) => m.document_id))];
  const { data: docs } = ids.length
    ? await db.from("documents").select("id, title, renewed_at").in("id", ids)
    : { data: [] as { id: string; title: string; renewed_at: string }[] };
  const docInfo = new Map((docs ?? []).map((d) => [d.id, d]));

  const docHits: KnowledgeHit[] = (docRes.data ?? []).map((m) => {
    const info = docInfo.get(m.document_id);
    const renewal = info ? renewalStatus(info.renewed_at) : null;
    return {
      id: m.id,
      kind: "document",
      title: info?.title ?? "Document",
      content: m.content,
      similarity: m.similarity,
      ...(renewal?.state === "overdue" ? { renewalDue: renewal.due.toISOString().slice(0, 10) } : {}),
    };
  });
  const msgHits: KnowledgeHit[] = (msgRes.data ?? []).map((m) => ({
    id: m.id,
    kind: "message",
    title: messageTitle(m),
    content: m.body,
    similarity: m.similarity,
    channel: m.channel === "teams" ? "teams" : "outlook",
    from: m.from_address,
    date: m.received_at,
  }));
  const changeHits: KnowledgeHit[] = (chgRes.data ?? []).map((c) => ({
    id: c.id,
    kind: "change",
    title: changeTitle(c),
    content: c.summary,
    similarity: c.similarity,
    date: c.change_date,
    changeType: c.change_type,
  }));
  return [...docHits, ...msgHits, ...changeHits].sort((a, b) => b.similarity - a.similarity);
}
