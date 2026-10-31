import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { embedTexts, extractKnowledge, type Extraction } from "./ai.server";
import { extractText } from "./extract-text.server";
import {
  changeKey,
  chunkText,
  normalizeChangeType,
  normalizeDate,
  normalizeProductName,
  normalizeVersion,
  productKey,
} from "./kb-rules";

type Client = SupabaseClient<Database>;
type Source = { documentId?: string | null; emailId?: string | null };

export async function findOrCreateProduct(
  db: Client,
  name: string,
  extra?: { description?: string | null; category?: string | null },
): Promise<string> {
  const clean = normalizeProductName(name);
  const { data: all, error } = await db.from("products").select("id, name, description, category");
  if (error) throw error;
  const existing = all?.find((p) => productKey(p.name) === productKey(clean));
  if (existing) {
    const patch: { description?: string; category?: string } = {};
    if (!existing.description && extra?.description) patch.description = extra.description;
    if (!existing.category && extra?.category) patch.category = extra.category;
    if (Object.keys(patch).length) await db.from("products").update(patch).eq("id", existing.id);
    return existing.id;
  }
  const { data, error: insErr } = await db
    .from("products")
    .insert({ name: clean, description: extra?.description ?? null, category: extra?.category ?? null })
    .select("id")
    .single();
  if (insErr) {
    // Lost a race on the unique name index: re-read.
    const { data: again } = await db.from("products").select("id, name");
    const hit = again?.find((p) => productKey(p.name) === productKey(clean));
    if (hit) return hit.id;
    throw insErr;
  }
  return data.id;
}

export async function upsertVersion(
  db: Client,
  productId: string,
  version: string,
  releaseDate: string | null,
  notes: string | null,
  source: Source,
) {
  const v = normalizeVersion(version);
  if (!v) return;
  await db.from("product_versions").upsert(
    {
      product_id: productId,
      version: v,
      release_date: normalizeDate(releaseDate),
      notes,
      source_document_id: source.documentId ?? null,
      source_email_id: source.emailId ?? null,
    },
    { onConflict: "product_id,version", ignoreDuplicates: true },
  );
}

/** Inserts a change unless an identical one exists. Returns the change id (new or existing). */
export async function insertChange(
  db: Client,
  productId: string,
  change: { version: string | null; date: string | null; type: string; summary: string },
  source: Source,
): Promise<string | null> {
  if (!change.summary?.trim()) return null;
  const version = normalizeVersion(change.version);
  const { data: existing } = await db
    .from("change_entries")
    .select("id, version, summary")
    .eq("product_id", productId);
  const key = changeKey(productId, version, change.summary);
  const dup = existing?.find((e) => changeKey(productId, e.version, e.summary) === key);
  if (dup) return dup.id;
  if (version) await upsertVersion(db, productId, version, change.date, null, source);
  const { data, error } = await db
    .from("change_entries")
    .insert({
      product_id: productId,
      version,
      change_date: normalizeDate(change.date),
      change_type: normalizeChangeType(change.type),
      summary: change.summary.trim(),
      source_document_id: source.documentId ?? null,
      source_email_id: source.emailId ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function applyExtraction(db: Client, extraction: Extraction, source: Source) {
  for (const p of extraction.products) {
    if (!p.name?.trim()) continue;
    const productId = await findOrCreateProduct(db, p.name, p);
    for (const v of p.versions) await upsertVersion(db, productId, v.version, v.release_date, v.notes, source);
    for (const c of p.changes) await insertChange(db, productId, c, source);
  }
}

/** Full pipeline for one stored document: read file, extract text, embed chunks, extract facts. */
export async function processStoredDocument(db: Client, documentId: string) {
  const { data: doc, error } = await db.from("documents").select("*").eq("id", documentId).single();
  if (error || !doc) throw new Error("Document not found");
  await db.from("documents").update({ status: "processing", error: null }).eq("id", documentId);
  try {
    if (!doc.file_path) throw new Error("Document has no file");
    const { data: blob, error: dlErr } = await db.storage.from("documents").download(doc.file_path);
    if (dlErr || !blob) throw new Error(`Could not read file: ${dlErr?.message}`);
    const text = await extractText(new Uint8Array(await blob.arrayBuffer()), doc.title, doc.mime_type);
    if (!text.trim()) throw new Error("No readable text found (scanned PDFs are not supported yet).");

    const chunks = chunkText(text);
    const vectors = await embedTexts(chunks);
    await db.from("document_chunks").delete().eq("document_id", documentId);
    for (let i = 0; i < chunks.length; i += 50) {
      const rows = chunks.slice(i, i + 50).map((content, j) => ({
        document_id: documentId,
        chunk_index: i + j,
        content,
        embedding: JSON.stringify(vectors[i + j]),
      }));
      const { error: insErr } = await db.from("document_chunks").insert(rows);
      if (insErr) throw insErr;
    }

    const extraction = await extractKnowledge(doc.title, text);
    await applyExtraction(db, extraction, { documentId, emailId: doc.source_email_id });
    await db.from("documents").update({ status: "ready", summary: extraction.summary || null }).eq("id", documentId);
    return { chunks: chunks.length, products: extraction.products.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from("documents").update({ status: "failed", error: message.slice(0, 1000) }).eq("id", documentId);
    throw e;
  }
}
