import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChangeType, Empty, PageHeader, Status } from "@/frontend/components/kb-ui";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — CheckIT" },
      { name: "description", content: "Knowledge base overview: products, documents and recent changes." },
      { property: "og:title", content: "Overview — CheckIT" },
      { property: "og:description", content: "Knowledge base overview." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [products, docs, changes, pending, recentDocs, recentChanges] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("change_entries").select("id", { count: "exact", head: true }),
        supabase.from("email_change_proposals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("documents").select("id, title, status, created_at").order("created_at", { ascending: false }).limit(6),
        supabase
          .from("change_entries")
          .select("id, summary, version, change_date, change_type, product_id, products(name)")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      return {
        stats: [
          { label: "Tracked items", value: products.count ?? 0 },
          { label: "Documents", value: docs.count ?? 0 },
          { label: "Recorded changes", value: changes.count ?? 0 },
          { label: "Message changes to review", value: pending.count ?? 0 },
        ],
        recentDocs: recentDocs.data ?? [],
        recentChanges: recentChanges.data ?? [],
      };
    },
  });

  return (
    <>
      <PageHeader eyebrow="Overview" title="Check IT" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(data?.stats ?? []).map((s) => (
          <div key={s.label} className="paper p-5">
            <p className="eyebrow">{s.label}</p>
            <p className="mt-2 font-serif text-4xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xl font-semibold">Recent changes</h2>
          {data && !data.recentChanges.length ? (
            <Empty>No changes yet. Upload a document to get started.</Empty>
          ) : (
            <ul className="paper divide-y">
              {data?.recentChanges.map((c: any) => (
                <li key={c.id} className="p-4">
                  <div className="flex items-center gap-2 text-xs">
                    <ChangeType type={c.change_type} />
                    <span className="font-medium">{c.products?.name}</span>
                    {c.version && <span className="font-mono text-muted-foreground">v{c.version}</span>}
                    <span className="ml-auto font-mono text-muted-foreground">{c.change_date ?? ""}</span>
                  </div>
                  <p className="mt-1.5 text-sm">{c.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold">Recent documents</h2>
          {data && !data.recentDocs.length ? (
            <Empty>
              <Link to="/documents" className="text-primary underline">Upload your first document</Link>
            </Empty>
          ) : (
            <ul className="paper divide-y">
              {data?.recentDocs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <span className="truncate">{d.title}</span>
                  <Status status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
