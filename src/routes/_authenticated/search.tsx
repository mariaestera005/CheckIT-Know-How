import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BellRing, FileText, History, Loader2, Mail, MessagesSquare, Sparkles, Search as SearchIcon } from "lucide-react";
import { askKnowledge, searchKnowledge } from "@/backend/kb.functions";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Empty, PageHeader } from "@/frontend/components/kb-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Search & Ask — CheckIT" },
      { name: "description", content: "Search documents, Outlook emails, Teams messages and past changes, or ask for cited solutions." },
      { property: "og:title", content: "Search & Ask — CheckIT" },
      { property: "og:description", content: "Search documents, messages and past changes, or ask for cited solutions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

type Kind = "document" | "message" | "change";
type Meta = { kind: Kind; title: string; channel?: "outlook" | "teams"; from?: string | null; date?: string | null; changeType?: string; renewalDue?: string };
type Hit = Meta & { id: string; content: string; similarity: number };
type Answer = { answer?: string; error?: string; sources?: (Meta & { n: number; excerpt: string })[] };
type Filter = "all" | Kind;

function SourceTag({ m }: { m: Meta }) {
  const Icon = m.kind === "document" ? FileText : m.kind === "change" ? History : m.channel === "teams" ? MessagesSquare : Mail;
  const label = m.kind === "document" ? "Document" : m.kind === "change" ? "Past change" : m.channel === "teams" ? "Teams" : "Outlook";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
      <Icon className="size-3" /> {label}
    </span>
  );
}

function MessageMeta({ m }: { m: Meta }) {
  if (m.kind === "document" && m.renewalDue)
    return (
      <p className="inline-flex items-center gap-1 text-xs text-warning">
        <BellRing className="size-3" /> Needs renewing: due since <span className="font-mono">{m.renewalDue}</span>
      </p>
    );
  if (m.kind === "change")
    return (
      <p className="text-xs text-muted-foreground">
        <span className="capitalize">{m.changeType ?? "change"}</span>
        <span className="font-mono"> · {m.date?.slice(0, 10) ?? "undated"}</span>
      </p>
    );
  if (m.kind !== "message") return null;
  return (
    <p className="text-xs text-muted-foreground">
      {m.from ?? "Unknown sender"}
      {m.date && <span className="font-mono"> · {m.date.slice(0, 10)}</span>}
    </p>
  );
}

function SearchPage() {
  const search = useServerFn(searchKnowledge);
  const ask = useServerFn(askKnowledge);
  const [q, setQ] = useState("");
  const [question, setQuestion] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setSearchError(null);
    try {
      setHits(await search({ data: { query: q } }));
    } catch (err) {
      setHits(null);
      setSearchError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }
  async function doAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setAnswer(null);
    try {
      setAnswer(await ask({ data: { question } }));
    } catch (err) {
      setAnswer({ error: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  }

  const shown = hits?.filter((h) => filter === "all" || h.kind === filter);
  const count = (k: Kind) => hits?.filter((h) => h.kind === k).length ?? 0;

  return (
    <>
      <PageHeader eyebrow="Find" title="Search & Ask" />
      <p className="-mt-4 mb-6 text-sm text-muted-foreground">
        Looks through your documents, Outlook emails, Teams messages and past changes. Describe a problem in Ask AI to get a suggested solution.
      </p>
      <Tabs defaultValue="ask">
        <TabsList>
          <TabsTrigger value="ask"><Sparkles /> Ask AI</TabsTrigger>
          <TabsTrigger value="search"><SearchIcon /> Search</TabsTrigger>
        </TabsList>
        <TabsContent value="ask" className="mt-6">
          <form onSubmit={doAsk} className="flex gap-2">
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What would you like to ask?" />
            <Button disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : "Ask"}</Button>
          </form>
          {answer?.error && <p className="mt-6 text-sm text-destructive">{answer.error}</p>}
          {answer?.answer && (
            <div className="paper mt-6 p-6">
              <p className="whitespace-pre-wrap leading-relaxed">{answer.answer}</p>
              {!!answer.sources?.length && (
                <div className="mt-6 border-t pt-4">
                  <p className="eyebrow mb-2">Sources</p>
                  <ol className="space-y-3 text-sm">
                    {answer.sources.map((s) => (
                      <li key={s.n}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-primary">[{s.n}]</span>
                          <SourceTag m={s} />
                          <span className="font-medium">{s.title}</span>
                        </div>
                        <MessageMeta m={s} />
                        <p className="line-clamp-2 text-muted-foreground">{s.excerpt}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        <TabsContent value="search" className="mt-6">
          <form onSubmit={doSearch} className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents, messages and past changes by meaning…" />
            <Button disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : "Search"}</Button>
          </form>
          {searchError && <p className="mt-6 text-sm text-destructive">{searchError}</p>}
          {hits && hits.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["all", `All (${hits.length})`],
                  ["document", `Documents (${count("document")})`],
                  ["message", `Outlook & Teams (${count("message")})`],
                  ["change", `Past changes (${count("change")})`],
                ] as [Filter, string][]
              ).map(([f, label]) => (
                <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                  {label}
                </Button>
              ))}
            </div>
          )}
          <div className="mt-6 space-y-3">
            {shown && !shown.length && <Empty>No matches.</Empty>}
            {shown?.map((h) => (
              <div key={h.id} className="paper p-4">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <SourceTag m={h} />
                    <span className="font-medium">{h.title}</span>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{Math.round(h.similarity * 100)}% match</span>
                </div>
                <MessageMeta m={h} />
                <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{h.content}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
