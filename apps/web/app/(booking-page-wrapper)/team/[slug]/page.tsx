import { prisma } from "@calcom/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ instant?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const team = await prisma.team.findFirst({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      logoUrl: true,
      eventTypes: {
        where: { hidden: false },
        select: { title: true, slug: true, length: true, description: true, schedulingType: true },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!team) notFound();
  let instantValid = false;
  if (query.instant) {
    const token = await prisma.instantMeetingToken.findUnique({ where: { token: query.instant } });
    instantValid = !!token && token.teamId === team.id && token.expires > new Date();
  }
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{team.name}</h1>
      {team.bio && <p className="text-subtle mt-2">{team.bio}</p>}
      {instantValid && (
        <p className="border-subtle bg-subtle mt-4 rounded-md border p-3 text-sm">
          Instant meeting is ready. Pick an event type below to start now.
        </p>
      )}
      <ul className="mt-8 space-y-3">
        {team.eventTypes.map((eventType) => (
          <li key={eventType.slug}>
            <Link
              href={`/team/${team.slug}/${eventType.slug}${instantValid ? `?instant=${query.instant}` : ""}`}
              className="border-subtle block rounded-md border p-4 hover:bg-subtle">
              <div className="font-medium">{eventType.title}</div>
              <div className="text-subtle text-sm">
                {eventType.length} min
                {eventType.schedulingType ? ` · ${eventType.schedulingType}` : ""}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
