import type { ReactNode } from "react";
import { cn } from "@/frontend/lib/utils";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1 text-4xl font-semibold">{title}</h1>
      </div>
      {children}
    </div>
  );
}

const typeStyles: Record<string, string> = {
  added: "bg-accent text-accent-foreground",
  changed: "bg-secondary text-secondary-foreground",
  fixed: "bg-highlight/40 text-highlight-foreground",
  removed: "bg-destructive/15 text-destructive",
  deprecated: "bg-muted text-muted-foreground",
  security: "bg-destructive/15 text-destructive",
};

export function ChangeType({ type }: { type: string }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider", typeStyles[type] ?? typeStyles["changed"])}>
      {type}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  ready: "text-success",
  applied: "text-success",
  processed: "text-success",
  processing: "text-warning",
  uploaded: "text-muted-foreground",
  pending: "text-warning",
  unread: "text-outlook",
  failed: "text-destructive",
  rejected: "text-muted-foreground",
  ignored: "text-muted-foreground",
};

export function Status({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs", statusStyles[status] ?? "text-muted-foreground")}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">{children}</div>;
}
