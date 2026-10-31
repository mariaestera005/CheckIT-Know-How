import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { inviteMember, listTeam, removeMember, setAdmin } from "@/backend/kb.functions";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { PageHeader } from "@/frontend/components/kb-ui";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team — CheckIT" },
      { name: "description", content: "Manage who can access the knowledge base." },
      { property: "og:title", content: "Team — CheckIT" },
      { property: "og:description", content: "Manage who can access the knowledge base." },
    ],
  }),
  component: Team,
});

function Team() {
  const qc = useQueryClient();
  const list = useServerFn(listTeam);
  const invite = useServerFn(inviteMember);
  const setRole = useServerFn(setAdmin);
  const remove = useServerFn(removeMember);
  const [email, setEmail] = useState("");
  const { data } = useQuery({ queryKey: ["team"], queryFn: () => list() });

  async function act(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      qc.invalidateQueries({ queryKey: ["team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <>
      <PageHeader eyebrow="People" title="Team" />
      {data?.isAdmin && (
        <form
          className="paper mb-8 flex flex-wrap gap-2 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => invite({ data: { email, redirectTo: window.location.origin + "/dashboard" } }), `Invitation sent to ${email}`);
            setEmail("");
          }}
        >
          <Input type="email" required placeholder="colleague@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="max-w-sm" />
          <Button type="submit">Send invite</Button>
        </form>
      )}
      <ul className="paper divide-y">
        {data?.members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex-1">
              <p className="font-medium">{m.display_name ?? m.email}</p>
              <p className="text-sm text-muted-foreground">{m.email}</p>
            </div>
            <span className="font-mono text-xs uppercase text-muted-foreground">{m.isAdmin ? "admin" : "member"}</span>
            {data.isAdmin && m.id !== data.me && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => act(() => setRole({ data: { userId: m.id, admin: !m.isAdmin } }), "Role updated")}>
                  {m.isAdmin ? "Make member" : "Make admin"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => confirm(`Remove ${m.email}?`) && act(() => remove({ data: { userId: m.id } }), "Member removed")}
                >
                  Remove
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
