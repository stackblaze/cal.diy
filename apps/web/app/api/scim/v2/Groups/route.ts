import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { NextResponse } from "next/server";

function authorized(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  return !!process.env.SCIM_TOKEN && token === process.env.SCIM_TOKEN;
}

async function directoryForOrg() {
  const org = await prisma.team.findFirst({
    where: { isOrganization: true },
    select: { id: true, slug: true, name: true },
  });
  if (!org) return null;
  await prisma.organizationSettings.upsert({
    where: { organizationId: org.id },
    create: { organizationId: org.id, orgAutoAcceptEmail: "" },
    update: {},
  });
  const directory = await prisma.dSyncData.upsert({
    where: { organizationId: org.id },
    create: {
      directoryId: `dir-${org.id}`,
      tenant: org.slug || `org-${org.id}`,
      organizationId: org.id,
    },
    update: {},
  });
  return { org, directory };
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const mappings = await prisma.dSyncTeamGroupMapping.findMany({
    include: { team: { select: { id: true, name: true, slug: true } } },
    take: 100,
  });
  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: mappings.length,
    Resources: mappings.map((row) => ({
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
      id: String(row.id),
      displayName: row.groupName,
      meta: { teamId: row.teamId, teamSlug: row.team.slug },
    })),
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const displayName = String(body.displayName || "").trim();
  if (!displayName) return NextResponse.json({ detail: "displayName required" }, { status: 400 });
  const ctx = await directoryForOrg();
  if (!ctx) return NextResponse.json({ detail: "No organization" }, { status: 400 });
  let team = await prisma.team.findFirst({
    where: { name: displayName, parentId: ctx.org.id },
  });
  if (!team) {
    team = await prisma.team.create({
      data: {
        name: displayName,
        slug: displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `group-${Date.now()}`,
        parentId: ctx.org.id,
      },
    });
  }
  const mapping = await prisma.dSyncTeamGroupMapping.upsert({
    where: { teamId_groupName: { teamId: team.id, groupName: displayName } },
    create: {
      organizationId: ctx.org.id,
      teamId: team.id,
      directoryId: ctx.directory.directoryId,
      groupName: displayName,
    },
    update: {},
  });
  const members = Array.isArray(body.members) ? body.members : [];
  for (const member of members) {
    const value = String(member.value || "");
    const userId = Number(value);
    if (!userId) continue;
    await prisma.membership.upsert({
      where: { userId_teamId: { userId, teamId: team.id } },
      create: { userId, teamId: team.id, role: MembershipRole.MEMBER, accepted: true },
      update: { accepted: true },
    });
  }
  return NextResponse.json(
    {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
      id: String(mapping.id),
      displayName,
    },
    { status: 201 }
  );
}
