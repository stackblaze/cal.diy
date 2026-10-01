"use client";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

export default function TeamDetailView({ teamId }: { teamId: number }) {
  const utils = trpc.useUtils();
  const { data: team, isLoading } = trpc.viewer.teams.get.useQuery({ teamId });
  const invite = trpc.viewer.teams.invite.useMutation({
    onSuccess: () => {
      showToast("Invite sent", "success");
      void utils.viewer.teams.get.invalidate({ teamId });
    },
    onError: (error) => showToast(error.message, "error"),
  });
  const remove = trpc.viewer.teams.removeMember.useMutation({
    onSuccess: () => void utils.viewer.teams.get.invalidate({ teamId }),
  });
  const instant = trpc.viewer.teams.createInstant.useMutation({
    onSuccess: (data) => {
      showToast(data.url, "success");
      window.open(data.url, "_blank");
    },
  });
  const setHosts = trpc.viewer.teams.setHosts.useMutation({
    onSuccess: () => {
      showToast("Hosts updated", "success");
      void utils.viewer.teams.get.invalidate({ teamId });
    },
  });
  const [email, setEmail] = useState("");
  const { data: availability } = trpc.viewer.teams.getAvailability.useQuery({ teamId });
  const setAvailability = trpc.viewer.teams.setAvailability.useMutation({
    onSuccess: () => {
      showToast("Shared availability saved", "success");
      void utils.viewer.teams.getAvailability.invalidate({ teamId });
    },
  });

  if (isLoading || !team) return <p className="text-sm text-subtle">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{team.name}</h2>
        <p className="text-subtle text-sm">
          Public page: <a className="underline" href={`/team/${team.slug}`}>{`/team/${team.slug}`}</a>
        </p>
        <Button className="mt-2" size="sm" onClick={() => instant.mutate({ teamId })}>
          Instant meeting
        </Button>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email) return;
          invite.mutate({ teamId, email });
          setEmail("");
        }}>
        <input
          className="border-subtle bg-default w-full rounded-md border px-3 py-2 text-sm"
          placeholder="member@example.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit">Invite</Button>
      </form>
      <ul className="space-y-2">
        {team.members.map((member) => (
          <li key={member.userId} className="flex items-center justify-between text-sm">
            <span>
              {member.user.name || member.user.email} · {member.role}
              {!member.accepted ? " (pending)" : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove.mutate({ teamId, userId: member.userId })}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <div>
        <h3 className="mb-2 font-medium">Shared availability</h3>
        <p className="text-subtle mb-2 text-sm">
          Weekdays {availability?.slots?.[0]?.start || "09:00"}–{availability?.slots?.[0]?.end || "17:00"} (
          {availability?.timeZone})
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setAvailability.mutate({
              teamId,
              slots: [{ days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" }],
            })
          }>
          Set weekday 9–5 for hosts
        </Button>
      </div>
      <div>
        <h3 className="mb-2 font-medium">Event types</h3>
        <ul className="text-subtle space-y-1 text-sm">
          {team.eventTypes.map((eventType) => (
            <li key={eventType.id} className="flex items-center justify-between">
              <span>
                {eventType.title} · {eventType.schedulingType || "individual"} · {eventType.length}m
              </span>
              {eventType.schedulingType && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setHosts.mutate({
                      eventTypeId: eventType.id,
                      hosts: team.members
                        .filter((member) => member.accepted)
                        .map((member) => ({
                          userId: member.userId,
                          isFixed: eventType.schedulingType === "COLLECTIVE",
                        })),
                    })
                  }>
                  Assign hosts
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
