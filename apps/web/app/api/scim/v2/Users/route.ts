import { prisma } from "@calcom/prisma";
import { IdentityProvider, MembershipRole } from "@calcom/prisma/enums";
import { NextResponse } from "next/server";

function authorized(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  const expected = process.env.SCIM_TOKEN;
  return !!expected && token === expected;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const users = await prisma.user.findMany({
    take: 100,
    select: { id: true, email: true, name: true, username: true, identityProviderId: true },
  });
  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: users.length,
    Resources: users.map((user) => ({
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      id: String(user.id),
      userName: user.email,
      name: { formatted: user.name },
      active: true,
    })),
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const email = String(body.userName || body.emails?.[0]?.value || "").toLowerCase();
  if (!email) return NextResponse.json({ detail: "userName required" }, { status: 400 });
  const name = body.name?.formatted || email.split("@")[0];
  const existing = await prisma.user.findFirst({ where: { email } });
  const user =
    existing ||
    (await prisma.user.create({
      data: {
        email,
        name,
        username: `${email.split("@")[0]}-${crypto.randomUUID().slice(0, 6)}`,
        emailVerified: new Date(),
        identityProvider: IdentityProvider.SAML,
        identityProviderId: email,
      },
    }));
  const org = await prisma.team.findFirst({
    where: { isOrganization: true },
    select: { id: true },
  });
  if (org) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: user.id, teamId: org.id } },
      create: { userId: user.id, teamId: org.id, role: MembershipRole.MEMBER, accepted: true },
      update: { accepted: true },
    });
  }
  return NextResponse.json(
    {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      id: String(user.id),
      userName: user.email,
      name: { formatted: user.name },
      active: true,
    },
    { status: existing ? 200 : 201 }
  );
}
