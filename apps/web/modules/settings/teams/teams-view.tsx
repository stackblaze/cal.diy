"use client";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function TeamsView() {
  const utils = trpc.useUtils();
  const { data: teams, isLoading } = trpc.viewer.teams.list.useQuery();
  const create = trpc.viewer.teams.create.useMutation({
    onSuccess: () => {
      showToast("Team created", "success");
      void utils.viewer.teams.list.invalidate();
    },
    onError: (error) => showToast(error.message, "error"),
  });
  const accept = trpc.viewer.teams.accept.useMutation({
    onSuccess: () => void utils.viewer.teams.list.invalidate(),
  });
  const [name, setName] = useState("");
  const { data: session } = useSession();
  const myId = Number(session?.user?.id);

  if (isLoading) return <p className="text-sm text-subtle">Loading teams…</p>;

  return (
    <div className="space-y-6">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          create.mutate({ name: name.trim() });
          setName("");
        }}>
        <input
          className="border-subtle bg-default w-full rounded-md border px-3 py-2 text-sm"
          placeholder="New team name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={create.isPending}>
          Create
        </Button>
      </form>
      <ul className="space-y-3">
        {teams?.map((team) => {
          const mine = team.members.find((member) => member.userId === myId);
          const pending = !!mine && !mine.accepted;
          return (
            <li key={team.id} className="border-subtle flex items-center justify-between rounded-md border p-3">
              <div>
                <Link href={`/settings/teams/${team.id}`} className="font-medium hover:underline">
                  {team.name}
                </Link>
                <p className="text-subtle text-xs">
                  /team/{team.slug} · {team.members.filter((m) => m.accepted).length} members
                  {team.isOrganization ? " · organization" : ""}
                </p>
              </div>
              {pending && (
                <Button size="sm" onClick={() => accept.mutate({ teamId: team.id })}>
                  Accept invite
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
