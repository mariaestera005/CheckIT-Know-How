import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Mail, Phone, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/frontend/components/ui/input";
import { Button } from "@/frontend/components/ui/button";
import { PageHeader } from "@/frontend/components/kb-ui";
import { cn } from "@/frontend/lib/utils";
import { matchesPerson, PEOPLE, reportsOf, type Person } from "@/frontend/lib/people";

export const Route = createFileRoute("/_authenticated/people")({
  head: () => ({
    meta: [
      { title: "Who to ask — CheckIT" },
      { name: "description", content: "The company hierarchy and who can guide you with more information on each topic." },
      { property: "og:title", content: "Who to ask — CheckIT" },
      { property: "og:description", content: "Find the right person to guide you, by team and topic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: People,
});

const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

function People() {
  const [q, setQ] = useState("");
  const matches = PEOPLE.filter((p) => matchesPerson(p, q));
  const allTopics = ["Time off", "Benefits", "Laptops", "Releases", "Product roadmap", "Security", "Mobile apps", "Onboarding", "Expenses", "Escalations"];

  return (
    <>
      <PageHeader eyebrow="People" title="Who to ask" />
      <p className="-mt-4 mb-6 max-w-3xl text-sm text-muted-foreground">
        Need more information than the documents give you? Find the right person here. Start at the top of the
        company and follow the lines down, or type a topic to see who can help.
      </p>

      <div className="paper mb-6 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="What do you need help with? e.g. time off, laptops, releases"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {allTopics.map((t) => (
            <button
              key={t}
              onClick={() => setQ(q === t ? "" : t)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                q === t && "border-primary bg-primary/15 text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        {q.trim() && (
          <p className="mt-3 text-xs text-muted-foreground">
            {matches.length
              ? `Best people to ask: ${matches.map((m) => m.name).join(", ")}`
              : "No one matches that yet. Try another word, or ask the person at the top."}
          </p>
        )}
      </div>

      <Branch managerId={null} q={q} depth={0} />
    </>
  );
}

function Branch({ managerId, q, depth }: { managerId: string | null; q: string; depth: number }) {
  const people = reportsOf(managerId);
  if (!people.length) return null;
  return (
    <ul className={cn("space-y-3", depth > 0 && "mt-3 ml-4 border-l border-primary/30 pl-4 sm:ml-6 sm:pl-6")}>
      {people.map((p) => (
        <li key={p.id} className="relative">
          {depth > 0 && <span className="absolute -left-4 top-8 h-px w-4 bg-primary/30 sm:-left-6 sm:w-6" />}
          <PersonCard person={p} q={q} />
          <Branch managerId={p.id} q={q} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

function PersonCard({ person, q }: { person: Person; q: string }) {
  const hit = q.trim() !== "" && matchesPerson(person, q);
  const dim = q.trim() !== "" && !hit;
  const manager = PEOPLE.find((m) => m.id === person.managerId);
  const reports = reportsOf(person.id).length;

  return (
    <div
      className={cn(
        "paper flex flex-wrap items-start gap-4 p-4 transition",
        hit && "ring-2 ring-primary shadow-[0_0_24px_-6px_var(--primary)]",
        dim && "opacity-40",
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm font-medium text-primary-foreground">
        {initials(person.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">{person.name}{person.badge && <span className="rounded-full bg-primary/25 px-2 py-0.5 text-xs text-foreground">{person.badge}</span>}</p>
        <p className="text-sm text-muted-foreground">
          {person.role}
          {manager && <> · reports to {manager.name}</>}
          {reports > 0 && <> · leads {reports}</>}
        </p>
        <a href={`tel:${person.phone.replace(/\s/g, "")}`} className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground">
          <Phone className="size-3" /> {person.phone}
        </a>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Ask about:</span>
          {person.topics.map((t) => (
            <span key={t} className="rounded bg-accent px-1.5 py-0.5 text-[11px] text-accent-foreground">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" asChild>
          <a href={`tel:${person.phone.replace(/\s/g, "")}`}>
            <Phone /> Call
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={`mailto:${person.email}`}>
            <Mail /> Email
          </a>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Copy ${person.name}'s email`}
          onClick={() => {
            navigator.clipboard?.writeText(person.email);
            toast.success("Email copied");
          }}
        >
          <Copy />
        </Button>
      </div>
    </div>
  );
}
