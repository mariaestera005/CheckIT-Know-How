import { unzipSync, strFromU8 } from "fflate";

function decodeXmlEntities(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function docxToText(bytes: Uint8Array): string {
  const files = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" });
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("Not a valid Word document");
  const s = strFromU8(xml)
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeXmlEntities(s);
}

async function sheetToText(bytes: Uint8Array): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(bytes, { type: "array" });
  return wb.SheetNames.map((n) => `## Sheet: ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n]!)}`).join("\n\n");
}

async function pdfToText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).map((t, i) => `[Page ${i + 1}]\n${t}`).join("\n\n");
}

export function fileKind(name: string, mime?: string | null): "pdf" | "docx" | "sheet" | "text" | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (["xlsx", "xls", "csv", "ods"].includes(ext)) return "sheet";
  if (["txt", "md", "markdown", "log", "json", "changelog"].includes(ext) || mime?.startsWith("text/")) return "text";
  if (name.toLowerCase().includes("changelog")) return "text";
  return null;
}

export async function extractText(bytes: Uint8Array, name: string, mime?: string | null): Promise<string> {
  const kind = fileKind(name, mime);
  switch (kind) {
    case "pdf":
      return pdfToText(bytes);
    case "docx":
      return docxToText(bytes);
    case "sheet":
      return name.toLowerCase().endsWith(".csv") ? new TextDecoder().decode(bytes) : sheetToText(bytes);
    case "text":
      return new TextDecoder().decode(bytes);
    default:
      throw new Error("Unsupported file type. Use PDF, DOCX, XLSX, CSV, TXT or MD.");
  }
}
