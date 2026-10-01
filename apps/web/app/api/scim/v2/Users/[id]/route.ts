import { prisma } from "@calcom/prisma";
import { NextResponse } from "next/server";

function authorized(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  return !!process.env.SCIM_TOKEN && token === process.env.SCIM_TOKEN;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(req)) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!user) return NextResponse.json({ detail: "Not found" }, { status: 404 });
  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: String(user.id),
    userName: user.email,
    name: { formatted: user.name },
    active: true,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(req)) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const active = body.Operations?.find((op: { path?: string }) => op.path === "active")?.value;
  if (active === false) {
    await prisma.user.update({ where: { id: Number(id) }, data: { locked: true } });
  }
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id,
    userName: user?.email,
    active: !user?.locked,
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(req)) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.user.delete({ where: { id: Number(id) } }).catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
