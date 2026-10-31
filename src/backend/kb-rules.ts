// Pure rules shared by the ingestion pipeline and the email watcher.

export const CHANGE_TYPES = ["added", "changed", "fixed", "removed", "deprecated", "security"] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

export function normalizeProductName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function productKey(name: string): string {
  return normalizeProductName(name).toLowerCase();
}

export function normalizeVersion(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim().replace(/^v(?=\d)/i, "");
  return t.length ? t : null;
}

export function normalizeChangeType(t: string | null | undefined): ChangeType {
  const v = (t ?? "").toLowerCase().trim();
  return (CHANGE_TYPES as readonly string[]).includes(v) ? (v as ChangeType) : "changed";
}

/** Same product, same version and same summary (case/space-insensitive) count as one change. */
export function changeKey(productId: string, version: string | null, summary: string): string {
  return [productId, normalizeVersion(version) ?? "", summary.toLowerCase().replace(/\s+/g, " ").trim()].join("|");
}

/** Accept only real YYYY-MM-DD dates. */
export function normalizeDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim());
  if (!m) return null;
  const date = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== `${m[1]}-${m[2]}-${m[3]}`) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}


/** Split text into overlapping character chunks. */
export function chunkText(text: string, size = 1800, overlap = 200, maxChunks = 300): string[] {
  const clean = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length && chunks.length < maxChunks) {
    let end = Math.min(clean.length, start + size);
    if (end < clean.length) {
      const para = clean.lastIndexOf("\n\n", end);
      if (para > start + size / 2) end = para;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

/** Content must be renewed this many months after it was uploaded or last marked renewed. */
export const RENEWAL_MONTHS = 1;
/** Show "renew soon" this many days before the due date. */
export const RENEWAL_WARNING_DAYS = 7;

export type RenewalState = "overdue" | "soon" | "ok";

export function renewalDueDate(renewedAt: string | Date): Date {
  const d = new Date(renewedAt);
  const due = new Date(d);
  due.setUTCMonth(due.getUTCMonth() + RENEWAL_MONTHS);
  // Jan 31 + 1 month must land on the last day of February, not in March.
  if (due.getUTCDate() !== d.getUTCDate()) due.setUTCDate(0);
  return due;
}

export function renewalStatus(renewedAt: string | Date, now: Date = new Date()) {
  const due = renewalDueDate(renewedAt);
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
  const state: RenewalState = due.getTime() <= now.getTime() ? "overdue" : daysLeft <= RENEWAL_WARNING_DAYS ? "soon" : "ok";
  return { due, daysLeft, state };
}
