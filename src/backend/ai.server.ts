import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText, type LanguageModel } from "ai";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev";
const CHAT_MODEL = "openai/gpt-6-astra";
const EMBED_MODEL = "google/gemini-embedding-2";

export class AiGatewayError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
  /** Credit or policy problems that should pause background work. */
  get isBlocking() {
    return this.status === 402 || this.status === 403;
  }
}

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY)");
  return key;
}

function provider() {
  const key = apiKey();
  return createOpenAI({
    baseURL: `${GATEWAY}/v1`,
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
}

// Two copies of the provider types are installed; the runtime contract is the same.
const chatModel = () => provider().responses(CHAT_MODEL) as unknown as LanguageModel;

const reasoningOpts = {
  openai: {
    store: false,
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    include: ["reasoning.encrypted_content"],
  },
};

function toGatewayError(e: unknown): never {
  const anyE = e as { statusCode?: number; responseBody?: string; message?: string };
  if (anyE?.statusCode) {
    throw new AiGatewayError(anyE.statusCode, `AI request failed [${anyE.statusCode}]: ${anyE.responseBody ?? anyE.message}`);
  }
  throw e;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = apiKey();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 32) {
    const batch = texts.slice(i, i + 32);
    let res: Response | null = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      res = await fetch(`${GATEWAY}/v1/embeddings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: EMBED_MODEL, input: batch }),
      });
      if (res.ok || !(res.status === 429 || res.status >= 500) || attempt === 4) break;
      await res.body?.cancel();
      const ra = Number(res.headers.get("Retry-After"));
      await new Promise((r) => setTimeout(r, (ra > 0 ? ra * 1000 : 1000 * 2 ** attempt) + Math.random() * 500));
    }
    if (!res!.ok) {
      const body = await res!.text();
      console.error(`Embeddings failed [${res!.status}]: ${body}`);
      throw new AiGatewayError(res!.status, `Embeddings failed [${res!.status}]: ${body}`);
    }
    const json = (await res!.json()) as { data: { index: number; embedding: number[] }[] };
    const ordered: number[][] = new Array(batch.length);
    for (const d of json.data) ordered[d.index] = d.embedding;
    if (ordered.some((v) => !v)) throw new Error("Missing embedding in response");
    out.push(...ordered);
  }
  return out;
}

const extractionSchema = z.object({
  summary: z.string(),
  products: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
      category: z.string().nullable(),
      versions: z.array(
        z.object({ version: z.string(), release_date: z.string().nullable(), notes: z.string().nullable() }),
      ),
      changes: z.array(
        z.object({
          version: z.string().nullable(),
          date: z.string().nullable(),
          type: z.string(),
          summary: z.string(),
        }),
      ),
    }),
  ),
});
export type Extraction = z.infer<typeof extractionSchema>;

export async function extractKnowledge(title: string, text: string): Promise<Extraction> {
  const result = streamText({
    model: chatModel(),
    instructions:
      "You build a company knowledge base. From the document, extract every item the company maintains: products and services, " +
      "and also internal policies or handbook sections (e.g. 'Benefits & Perks', 'Titles for Programmers'). For each item give its versions with release dates (if any) " +
      "and every change in its history. For policy or handbook documents without a change log, record no changes; describe the item instead. " +
      "Dates must be YYYY-MM-DD or null. Change type is one of: added, changed, fixed, removed, deprecated, security. " +
      "Keep each change summary to one clear, specific sentence (include concrete numbers that changed). Use consistent, human-readable item names " +
      "(e.g. 'Benefits & Perks', not 'benefits-and-perks.md'). category: Product, Service, Policy, Handbook section, etc. summary: 2-3 sentences describing the document.",
    messages: [{ role: "user", content: `Document title: ${title}\n\n${text.slice(0, 120_000)}` }],
    output: Output.object({ schema: extractionSchema }),
    providerOptions: reasoningOpts,
  });
  try {
    return (await result.output) as Extraction;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) return { summary: "", products: [] };
    toGatewayError(e);
  }
}

const emailSchema = z.object({
  is_product_update: z.boolean(),
  changes: z.array(
    z.object({
      product_name: z.string(),
      product_description: z.string().nullable(),
      version: z.string().nullable(),
      date: z.string().nullable(),
      type: z.string(),
      summary: z.string(),
      confidence: z.number(),
    }),
  ),
});
export type EmailExtraction = z.infer<typeof emailSchema>;

export async function extractEmailChanges(
  email: { subject: string; from: string; date: string; body: string },
  knownProducts: string[],
): Promise<EmailExtraction> {
  const result = streamText({
    model: chatModel(),
    instructions:
      "You read company Outlook emails and Microsoft Teams messages and detect product changes (new releases, versions, fixes, spec or pricing changes, removals). " +
      "Ignore newsletters, spam, social chat, meeting scheduling and anything that is not a concrete product change. " +
      "For each change give confidence 0..1 that it is a real, factual product change. Dates YYYY-MM-DD or null. " +
      "Type is one of: added, changed, fixed, removed, deprecated, security. Prefer these existing product names when they match: " +
      (knownProducts.slice(0, 200).join(", ") || "(none yet)"),
    messages: [
      {
        role: "user",
        content: `From: ${email.from}\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.body.slice(0, 30_000)}`,
      },
    ],
    output: Output.object({ schema: emailSchema }),
    providerOptions: reasoningOpts,
  });
  try {
    return (await result.output) as EmailExtraction;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) return { is_product_update: false, changes: [] };
    toGatewayError(e);
  }
}

export async function answerQuestion(question: string, context: string): Promise<string> {
  const result = streamText({
    model: chatModel(),
    instructions:
      "You are the company's knowledge assistant. Using only the numbered sources (uploaded documents, Outlook emails, Microsoft Teams messages " +
      "and past changes recorded in the knowledge base), answer the question and, when the person describes a problem or asks what to do, give a practical solution. " +
      "Format: start with a short direct answer. If a solution is useful, add 'Suggested solution:' with 2-5 numbered steps grounded in the sources. " +
      "Then add 'What happened before:' with relevant past changes, decisions or similar situations and how they were handled (skip it if none apply). " +
      "Cite every claim inline like [1], [2]. When sources disagree, prefer the most recent dated source and mention the difference. " +
      "If you rely on a document marked OUTDATED, end with 'Renewal reminder:' naming it and saying its content is due to be renewed. " +
      "If the sources do not cover it, say so plainly and do not invent policies, numbers or names. Plain text, no markdown headings or bold.",
    messages: [{ role: "user", content: `Sources:\n${context}\n\nQuestion: ${question}` }],
    providerOptions: reasoningOpts,
  });
  try {
    return await result.text;
  } catch (e) {
    toGatewayError(e);
  }
}
