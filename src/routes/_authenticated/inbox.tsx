import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Check, Hash, Loader2, Mail, MessagesSquare, PenSquare, RefreshCw, Send, Sparkles, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEmailStatus, reviewProposal, runEmailSyncNow, sendMockMessage, updateEmailSettings } from "@/backend/kb.functions";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Switch } from "@/frontend/components/ui/switch";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs";
import { ChangeType, Empty, PageHeader, Status } from "@/frontend/components/kb-ui";
import { cn } from "@/frontend/lib/utils";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({
    meta: [
      { title: "Outlook & Teams — CheckIT" },
      { name: "description", content: "Demo Outlook inbox and Teams channels that the AI reads for product changes." },
      { property: "og:title", content: "Outlook & Teams — CheckIT" },
      { property: "og:description", content: "Product changes found in Outlook and Teams." },
    ],
  }),
  component: Inbox,
});

const PEOPLE = [
  { name: "Elena Popescu", email: "elena.popescu@contoso-demo.com", role: "Product Manager" },
  { name: "Mihai Ionescu", email: "mihai.ionescu@contoso-demo.com", role: "Hardware Lead" },
  { name: "Andrei Dumitru", email: "andrei.dumitru@contoso-demo.com", role: "Mobile Engineer" },
  { name: "Ioana Stan", email: "ioana.stan@contoso-demo.com", role: "Backend Engineer" },
  { name: "Radu Marin", email: "radu.marin@contoso-demo.com", role: "Office Manager" },
];
const CHANNELS = ["Product Updates", "Engineering", "General"];

const initials = (s: string) =>
  s.replace(/<.*>/, "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const senderName = (s: string | null) => (s ?? "Unknown").replace(/<.*>/, "").trim();
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "");

function Avatar({ name, tone }: { name: string; tone: "outlook" | "teams" }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium text-primary-foreground",
        tone === "outlook" ? "bg-outlook" : "bg-teams",
      )}
    >
      {initials(name)}
    </span>
  );
}

type Msg = {
  id: string;
  channel: string;
  channel_name: string | null;
  from_address: string | null;
  subject: string | null;
  body: string | null;
  received_at: string | null;
  created_at: string;
  status: string;
  error: string | null;
};

function Inbox() {
  const qc = useQueryClient();
  const status = useServerFn(getEmailStatus);
  const runNow = useServerFn(runEmailSyncNow);
  const send = useServerFn(sendMockMessage);
  const [running, setRunning] = useState(false);

  const { data: st } = useQuery({ queryKey: ["email-status"], queryFn: () => status() });
  const { data: messages } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emails")
        .select("id, channel, channel_name, from_address, subject, body, received_at, created_at, status, error")
        .order("received_at", { ascending: false });
      if (error) throw error;
      return data as Msg[];
    },
  });
  const { data: proposals } = useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_change_proposals")
        .select("*, emails(subject, from_address, channel, channel_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const unread = (messages ?? []).filter((m) => m.status === "pending").length;
  const pendingReview = (proposals ?? []).filter((p) => p.status === "pending").length;

  async function readAll() {
    setRunning(true);
    try {
      const r = await runNow();
      if (r.status === "ok") toast.success(`AI read ${r.processed} message(s)`);
      else toast.message(r.message ?? r.status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setRunning(false);
      qc.invalidateQueries();
    }
  }

  async function post(data: Parameters<typeof send>[0]["data"]) {
    try {
      const r = await send({ data });
      if (r.status === "ok") toast.success("Message sent, and the AI has read it");
      else toast.message(r.message ?? r.status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      qc.invalidateQueries();
    }
  }

  return (
    <>
      <PageHeader eyebrow="Prototype · demo data" title="Outlook & Teams">
        <Button onClick={readAll} disabled={running || !unread}>
          {running ? <Loader2 className="animate-spin" /> : <RefreshCw />} Let AI read {unread} new
        </Button>
      </PageHeader>
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted-foreground">
        This is a simulated company Outlook inbox and Teams workspace with demo colleagues. Send a message as any of
        them, and the AI picks out product changes for the knowledge base.
      </p>
      {st?.state?.paused_reason && (
        <div className="paper mb-6 p-5 text-sm">
          <p className="font-medium text-destructive">AI reading is paused</p>
          <p className="mt-1 text-muted-foreground">{st.state.paused_reason}</p>
        </div>
      )}

      <Tabs defaultValue="outlook">
        <TabsList>
          <TabsTrigger value="outlook"><Mail className="text-outlook" /> Outlook</TabsTrigger>
          <TabsTrigger value="teams"><MessagesSquare className="text-teams" /> Teams</TabsTrigger>
          <TabsTrigger value="findings">
            <Sparkles /> AI findings {pendingReview > 0 && <span className="ml-1 rounded bg-highlight px-1.5 font-mono text-[10px] text-highlight-foreground">{pendingReview}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="outlook" className="mt-6">
          <OutlookPane messages={(messages ?? []).filter((m) => m.channel === "outlook")} onSend={post} />
        </TabsContent>
        <TabsContent value="teams" className="mt-6">
          <TeamsPane messages={(messages ?? []).filter((m) => m.channel === "teams")} onSend={post} />
        </TabsContent>
        <TabsContent value="findings" className="mt-6">
          <Findings proposals={proposals ?? []} state={st?.state ?? null} />
        </TabsContent>
      </Tabs>
    </>
  );
}

type SendFn = (d: { channel: "outlook" | "teams"; from: string; subject?: string; channelName?: string; body: string }) => Promise<void>;

function PersonPicker({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-9 rounded-md border bg-background px-2 text-sm">
      {PEOPLE.map((p, i) => <option key={p.email} value={i}>{p.name} · {p.role}</option>)}
    </select>
  );
}

function OutlookPane({ messages, onSend }: { messages: Msg[]; onSend: SendFn }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [who, setWho] = useState(0);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const current = messages.find((m) => m.id === selected) ?? messages[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const p = PEOPLE[who]!;
    await onSend({ channel: "outlook", from: `${p.name} <${p.email}>`, subject, body });
    setBusy(false);
    setComposing(false);
    setSubject("");
    setBody("");
  }

  return (
    <div className="paper grid min-h-[560px] overflow-hidden md:grid-cols-[320px_1fr]">
      <div className="border-r">
        <div className="flex items-center justify-between border-b p-3">
          <span className="text-sm font-medium">Inbox</span>
          <Button size="sm" variant="outline" onClick={() => setComposing(true)}><PenSquare /> New email</Button>
        </div>
        <ul className="divide-y">
          {messages.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => {
                  setSelected(m.id);
                  setComposing(false);
                }}
                className={cn("w-full p-3 text-left hover:bg-muted", current?.id === m.id && !composing && "bg-accent")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm", m.status === "pending" && "font-semibold")}>{senderName(m.from_address)}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{fmt(m.received_at)}</span>
                </div>
                <p className="truncate text-sm">{m.subject}</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="truncate text-xs text-muted-foreground">{m.body?.slice(0, 60)}</p>
                  <Status status={m.status === "pending" ? "unread" : m.status} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-6">
        {composing ? (
          <form onSubmit={submit} className="space-y-3">
            <h3 className="text-xl font-semibold">New email</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-12 text-muted-foreground">From</span>
              <PersonPicker value={who} onChange={setWho} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-12 text-muted-foreground">To</span>
              <span className="font-mono text-xs">product-team@contoso-demo.com</span>
            </div>
            <Input required placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea required rows={10} placeholder="e.g. Nimbus CRM 4.3 ships next Monday with SSO support…" value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Send />} Send</Button>
              <Button type="button" variant="ghost" onClick={() => setComposing(false)}>Discard</Button>
            </div>
          </form>
        ) : current ? (
          <article>
            <h3 className="text-2xl font-semibold">{current.subject}</h3>
            <div className="mt-4 flex items-center gap-3">
              <Avatar name={senderName(current.from_address)} tone="outlook" />
              <div className="text-sm">
                <p className="font-medium">{current.from_address}</p>
                <p className="font-mono text-xs text-muted-foreground">{fmt(current.received_at)}</p>
              </div>
              <span className="ml-auto"><Status status={current.status === "pending" ? "unread" : current.status} /></span>
            </div>
            <p className="mt-6 whitespace-pre-wrap leading-relaxed">{current.body}</p>
            {current.error && <p className="mt-4 text-sm text-destructive">{current.error}</p>}
          </article>
        ) : (
          <Empty>No emails.</Empty>
        )}
      </div>
    </div>
  );
}

function TeamsPane({ messages, onSend }: { messages: Msg[]; onSend: SendFn }) {
  const [channel, setChannel] = useState(CHANNELS[0]!);
  const [who, setWho] = useState(2);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const thread = useMemo(
    () =>
      messages
        .filter((m) => (m.channel_name ?? "General") === channel)
        .sort((a, b) => (a.received_at ?? "").localeCompare(b.received_at ?? "")),
    [messages, channel],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    await onSend({ channel: "teams", from: PEOPLE[who]!.name, channelName: channel, body });
    setBusy(false);
    setBody("");
  }

  return (
    <div className="paper grid min-h-[560px] overflow-hidden md:grid-cols-[240px_1fr]">
      <div className="border-r bg-muted/40 p-3">
        <p className="eyebrow mb-2 px-2">Contoso · Product team</p>
        {CHANNELS.map((c) => {
          const unread = messages.filter((m) => (m.channel_name ?? "General") === c && m.status === "pending").length;
          return (
            <button
              key={c}
              onClick={() => setChannel(c)}
              className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent", channel === c && "bg-accent font-medium")}
            >
              <Hash className="size-3.5 text-teams" /> {c}
              {unread > 0 && <span className="ml-auto rounded-full bg-teams px-1.5 font-mono text-[10px] text-primary-foreground">{unread}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col">
        <div className="border-b p-3 text-sm font-medium"># {channel}</div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {!thread.length && <Empty>No messages in this channel yet.</Empty>}
          {thread.map((m) => (
            <div key={m.id} className="flex gap-3">
              <Avatar name={m.from_address ?? "?"} tone="teams" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{m.from_address}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{fmt(m.received_at)}</span>
                  <span className="ml-auto"><Status status={m.status === "pending" ? "unread" : m.status} /></span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
                {m.error && <p className="mt-1 text-xs text-destructive">{m.error}</p>}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="flex flex-wrap gap-2 border-t p-3">
          <PersonPicker value={who} onChange={setWho} />
          <Input className="min-w-60 flex-1" placeholder={`Message #${channel} as ${PEOPLE[who]!.name}`} value={body} onChange={(e) => setBody(e.target.value)} />
          <Button type="submit" disabled={busy || !body.trim()}>{busy ? <Loader2 className="animate-spin" /> : <Send />}</Button>
        </form>
      </div>
    </div>
  );
}

function Findings({ proposals, state }: { proposals: any[]; state: any }) {
  const qc = useQueryClient();
  const update = useServerFn(updateEmailSettings);
  const review = useServerFn(reviewProposal);
  const [editing, setEditing] = useState<{ id: string; summary: string } | null>(null);
  const refresh = () => qc.invalidateQueries();

  async function settings(patch: Parameters<typeof update>[0]["data"]) {
    try {
      await update({ data: patch });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Only admins can change this");
    }
  }
  async function act(id: string, action: "apply" | "reject" | "undo", summary?: string) {
    try {
      await review({ data: summary ? { id, action, summary } : { id, action } });
      setEditing(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <>
      {state && (
        <div className="paper mb-6 p-5">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>AI reads new messages</span>
            <Switch checked={state.enabled} onCheckedChange={(v) => settings({ enabled: v })} />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">Every change the AI finds is added to the knowledge base right away. Click Undo on any finding to take it back out.</p>
        </div>
      )}
      {!proposals.length ? (
        <Empty>No product changes found yet. Let the AI read the new messages.</Empty>
      ) : (
        <ul className="space-y-3">
          {proposals.map((p) => (
            <li key={p.id} className="paper p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <ChangeType type={p.change_type} />
                <span className="font-medium">{p.product_name}</span>
                {p.version && <span className="font-mono text-muted-foreground">v{p.version}</span>}
                <span className="ml-auto"><Status status={p.status} /></span>
              </div>
              {editing?.id === p.id ? (
                <Textarea className="mt-2" value={editing?.summary ?? ""} onChange={(e) => setEditing({ id: p.id, summary: e.target.value })} />
              ) : (
                <p className="mt-2 text-sm">{p.summary}</p>
              )}
              <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                {p.emails?.channel === "teams" ? (
                  <><MessagesSquare className="size-3 text-teams" /> Teams #{p.emails?.channel_name} · {p.emails?.from_address}</>
                ) : (
                  <><Mail className="size-3 text-outlook" /> Outlook “{p.emails?.subject}” · {senderName(p.emails?.from_address)}</>
                )}
              </p>
              <div className="mt-3 flex gap-2">
                {p.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => act(p.id, "apply", editing?.id === p.id ? editing?.summary : undefined)}><Check /> Add to knowledge base</Button>
                    {editing?.id !== p.id && <Button size="sm" variant="outline" onClick={() => setEditing({ id: p.id, summary: p.summary })}>Edit</Button>}
                    <Button size="sm" variant="ghost" onClick={() => act(p.id, "reject")}><X /> Dismiss</Button>
                  </>
                )}
                {p.status === "applied" && <Button size="sm" variant="outline" onClick={() => act(p.id, "undo")}><Undo2 /> Undo</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
