import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, GitCommitHorizontal, Mail, Search } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CheckIT — Your company's product memory" },
      {
        name: "description",
        content: "Upload product documents and changelogs. CheckIT builds a searchable knowledge base and keeps it current from your inbox.",
      },
      { property: "og:title", content: "CheckIT — Your company's product memory" },
      {
        property: "og:description",
        content: "Product documents, version history and Outlook & Teams updates in one searchable knowledge base.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: FileText, title: "Reads your documents", text: "PDF, Word, spreadsheets and changelogs become products, versions and changes." },
  { icon: GitCommitHorizontal, title: "Keeps the history", text: "Every product gets a dated timeline, with each fact linked to its source." },
  { icon: Mail, title: "Reads Outlook & Teams", text: "AI reads team emails and Teams messages and records product changes as they happen." },
  { icon: Search, title: "Answers questions", text: "Search by meaning, or ask in plain words and get cited answers." },
];

function Landing() {
  return (
    <div className="min-h-screen ruled">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-serif text-2xl font-semibold">CheckIT</span>
        <Button asChild variant="outline">
          <Link to="/dashboard">Open the app</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <p className="eyebrow">Product knowledge base · est. today</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[1.05] md:text-7xl">
          Your company's product memory, <em className="text-primary">always up to date.</em>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Drop in product documents and change history. CheckIT turns them into a searchable record of every
          product, version and change, and keeps it current from your team's Outlook and Teams conversations.
        </p>
        <div className="mt-10 flex gap-3">
          <Button asChild size="lg">
            <Link to="/dashboard">
              Try it now, no login <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="mt-24 grid gap-4 md:grid-cols-4">
          {features.map((f, i) => (
            <div key={f.title} className="paper p-6">
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <f.icon className="mt-4 size-5 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
