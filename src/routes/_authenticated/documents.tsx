import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { BellRing, CalendarCheck, Loader2, Mail, RotateCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { processDocument } from "@/backend/kb.functions";
import { Button } from "@/frontend/components/ui/button";
import { Empty, PageHeader, Status } from "@/frontend/components/kb-ui";
import { cn } from "@/frontend/lib/utils";
import { RENEWAL_MONTHS, renewalStatus } from "@/backend/kb-rules";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documents — CheckIT" },
      { name: "description", content: "Upload product documents, spreadsheets and changelogs." },
      { property: "og:title", content: "Documents — CheckIT" },
      { property: "og:description", content: "Upload product documents, spreadsheets and changelogs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Documents,
});

const ACCEPT = ".pdf,.docx,.xlsx,.xls,.csv,.txt,.md";

function Documents() {
  const qc = useQueryClient();
  const process = useServerFn(processDocument);
  const { user } = Route.useRouteContext();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [working, setWorking] = useState<Set<string>>(new Set());

  const { data: docs } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => (q.state.data?.some((d) => d.status === "processing") ? 4000 : false),
  });

  async function run(id: string) {
    setWorking((s) => new Set(s).add(id));
    qc.invalidateQueries({ queryKey: ["documents"] });
    const res = await process({ data: { documentId: id } });
    setWorking((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    if (res.ok) toast.success(`Processed: ${res.products} product(s) found`);
    else toast.error(res.error);
    qc.invalidateQueries();
  }

  async function upload(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 20 MB`);
        continue;
      }
      const path = `uploads/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
      if (upErr) {
        toast.error(upErr.message);
        continue;
      }
      const { data, error } = await supabase
        .from("documents")
        .insert({ title: file.name, file_path: path, mime_type: file.type || null, size_bytes: file.size, created_by: user.id })
        .select("id")
        .single();
      if (error) {
        toast.error(error.message);
        continue;
      }
      void run(data.id);
    }
  }

  async function markRenewed(id: string) {
    const { error } = await supabase.from("documents").update({ renewed_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Marked as renewed. Next reminder in one month.");
    qc.invalidateQueries({ queryKey: ["documents"] });
  }

  const dueCount = docs?.filter((d) => renewalStatus(d.renewed_at).state !== "ok").length ?? 0;

  async function remove(d: { id: string; file_path: string | null }) {
    if (!confirm("Delete this document? Facts already extracted stay in the knowledge base.")) return;
    if (d.file_path) await supabase.storage.from("documents").remove([d.file_path]);
    await supabase.from("documents").delete().eq("id", d.id);
    qc.invalidateQueries();
  }

  return (
    <>
      <PageHeader eyebrow="Sources" title="Documents" />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        className={cn(
          "cursor-pointer rounded-md border-2 border-dashed p-10 text-center transition-colors",
          drag ? "border-primary bg-accent" : "hover:bg-muted",
        )}
      >
        <Upload className="mx-auto size-6 text-primary" />
        <p className="mt-3 font-medium">Drop files here or click to upload</p>
        <p className="mt-1 text-sm text-muted-foreground">PDF, Word, Excel, CSV, changelogs (TXT/MD), up to 20 MB</p>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Content needs renewing every {RENEWAL_MONTHS === 1 ? "month" : `${RENEWAL_MONTHS} months`}: check it is still correct, then click{" "}
        <span className="text-foreground">Mark renewed</span>.
        {dueCount > 0 && (
          <span className="ml-1 font-medium text-warning">
            {dueCount} document{dueCount === 1 ? "" : "s"} need{dueCount === 1 ? "s" : ""} renewing.
          </span>
        )}
      </p>

      <div className="mt-4">
        {docs && !docs.length ? (
          <Empty>No documents yet.</Empty>
        ) : (
          <ul className="paper divide-y">
            {docs?.map((d) => {
              const busy = working.has(d.id) || d.status === "processing";
              const renewal = renewalStatus(d.renewed_at);
              return (
                <li key={d.id} className="flex items-start gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {d.source === "email" && <Mail className="size-3.5 text-muted-foreground" />}
                      <p className="truncate font-medium">{d.title}</p>
                    </div>
                    {d.summary && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.summary}</p>}
                    {d.error && <p className="mt-1 text-sm text-destructive">{d.error}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
                      <span>{new Date(d.created_at).toLocaleString()}</span>
                      {renewal.state === "ok" ? (
                        <span>· renew by {renewal.due.toISOString().slice(0, 10)}</span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-sans",
                            renewal.state === "overdue"
                              ? "border-destructive/40 bg-destructive/15 text-destructive"
                              : "border-warning/40 bg-warning/15 text-warning",
                          )}
                        >
                          <BellRing className="size-3" />
                          {renewal.state === "overdue"
                            ? `Renewal overdue since ${renewal.due.toISOString().slice(0, 10)}`
                            : `Renew in ${renewal.daysLeft} day${renewal.daysLeft === 1 ? "" : "s"}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {busy ? (
                      <span className="flex items-center gap-1.5 font-mono text-xs text-warning">
                        <Loader2 className="size-3 animate-spin" /> processing
                      </span>
                    ) : (
                      <Status status={d.status} />
                    )}
                    {renewal.state !== "ok" && (
                      <Button size="sm" variant="outline" onClick={() => markRenewed(d.id)}>
                        <CalendarCheck /> Mark renewed
                      </Button>
                    )}
                    {!busy && (
                      <Button size="icon" variant="ghost" title="Process again" onClick={() => run(d.id)}>
                        <RotateCw />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" title="Delete" onClick={() => remove(d)}>
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
