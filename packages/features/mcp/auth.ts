import findValidApiKey from "@calcom/features/api-keys-legacy/api-keys/lib/findValidApiKey";
import { prisma } from "@calcom/prisma";

export type McpUser = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  timeZone: string;
  weekStart: string;
  defaultScheduleId: number | null;
  organizationId: number | null;
};

export async function authenticateMcpRequest(req: Request): Promise<McpUser | null> {
  const header = req.headers.get("authorization") || "";
  const fromQuery = new URL(req.url).searchParams.get("apiKey") || "";
  const raw = header.replace(/^Bearer\s+/i, "").trim() || fromQuery.trim();
  if (!raw) return null;
  const key = await findValidApiKey(raw);
  if (!key?.userId) return null;
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => undefined);
  const user = await prisma.user.findUnique({
    where: { id: key.userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      timeZone: true,
      weekStart: true,
      defaultScheduleId: true,
    },
  });
  if (!user) return null;
  const org = await prisma.membership.findFirst({
    where: { userId: user.id, accepted: true, team: { isOrganization: true } },
    select: { teamId: true },
  });
  return { ...user, organizationId: org?.teamId ?? null };
}
