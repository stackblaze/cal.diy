import slugify from "@calcom/lib/slugify";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { PrismaClient } from "@calcom/prisma";

type Ctx = { user: NonNullable<TrpcSessionUser>; prisma: PrismaClient };

async function requireMember(prisma: PrismaClient, userId: number, teamId: number, roles?: MembershipRole[]) {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      teamId,
      accepted: true,
      ...(roles ? { role: { in: roles } } : {}),
    },
  });
  if (!membership) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return membership;
}

export async function listHandler({ ctx }: { ctx: Ctx }) {
  return ctx.prisma.team.findMany({
    where: { members: { some: { userId: ctx.user.id } } },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      logoUrl: true,
      isOrganization: true,
      parentId: true,
      hideBranding: true,
      members: {
        select: {
          role: true,
          accepted: true,
          userId: true,
          user: { select: { id: true, name: true, email: true, username: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getHandler({ ctx, input }: { ctx: Ctx; input: { teamId: number } }) {
  await requireMember(ctx.prisma, ctx.user.id, input.teamId);
  const team = await ctx.prisma.team.findUnique({
    where: { id: input.teamId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, username: true, avatarUrl: true } },
        },
      },
      eventTypes: {
        select: { id: true, title: true, slug: true, schedulingType: true, length: true, hidden: true },
      },
    },
  });
  if (!team) throw new TRPCError({ code: "NOT_FOUND" });
  return team;
}

export async function createHandler({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: { name: string; slug?: string; bio?: string; isOrganization?: boolean; parentId?: number };
}) {
  if (input.parentId) {
    await requireMember(ctx.prisma, ctx.user.id, input.parentId, [MembershipRole.OWNER, MembershipRole.ADMIN]);
  }
  const slug = slugify(input.slug || input.name);
  const existing = await ctx.prisma.team.findFirst({
    where: { slug, parentId: input.parentId ?? null },
    select: { id: true },
  });
  if (existing) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Team slug already exists" });
  }
  const team = await ctx.prisma.team.create({
    data: {
      name: input.name,
      slug,
      bio: input.bio,
      parentId: input.parentId,
      isOrganization: !!input.isOrganization,
      members: {
        create: {
          userId: ctx.user.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
      ...(input.isOrganization
        ? {
            organizationSettings: {
              create: {
                orgAutoAcceptEmail: ctx.user.email.split("@")[1] || "",
                isOrganizationConfigured: true,
              },
            },
          }
        : {}),
    },
  });
  return team;
}

export async function updateHandler({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: { teamId: number; name?: string; slug?: string; bio?: string; hideBranding?: boolean };
}) {
  await requireMember(ctx.prisma, ctx.user.id, input.teamId, [MembershipRole.OWNER, MembershipRole.ADMIN]);
  const data: { name?: string; slug?: string; bio?: string; hideBranding?: boolean } = {};
  if (input.name) data.name = input.name;
  if (input.slug) data.slug = slugify(input.slug);
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.hideBranding !== undefined) data.hideBranding = input.hideBranding;
  return ctx.prisma.team.update({ where: { id: input.teamId }, data });
}

export async function deleteHandler({ ctx, input }: { ctx: Ctx; input: { teamId: number } }) {
  await requireMember(ctx.prisma, ctx.user.id, input.teamId, [MembershipRole.OWNER]);
  await ctx.prisma.team.delete({ where: { id: input.teamId } });
  return { ok: true };
}

export async function inviteHandler({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: { teamId: number; email: string; role?: "MEMBER" | "ADMIN" | "OWNER" };
}) {
  await requireMember(ctx.prisma, ctx.user.id, input.teamId, [MembershipRole.OWNER, MembershipRole.ADMIN]);
  const email = input.email.toLowerCase();
  const user = await ctx.prisma.user.findFirst({ where: { email } });
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User with that email is not on this instance" });
  }
  return ctx.prisma.membership.upsert({
    where: { userId_teamId: { userId: user.id, teamId: input.teamId } },
    create: {
      userId: user.id,
      teamId: input.teamId,
      role: (input.role as MembershipRole) || MembershipRole.MEMBER,
      accepted: false,
    },
    update: {
      role: (input.role as MembershipRole) || MembershipRole.MEMBER,
    },
  });
}

export async function acceptHandler({ ctx, input }: { ctx: Ctx; input: { teamId: number } }) {
  const membership = await ctx.prisma.membership.findFirst({
    where: { userId: ctx.user.id, teamId: input.teamId },
  });
  if (!membership) throw new TRPCError({ code: "NOT_FOUND" });
  return ctx.prisma.membership.update({
    where: { id: membership.id },
    data: { accepted: true },
  });
}

export async function createInstantHandler({ ctx, input }: { ctx: Ctx; input: { teamId: number } }) {
  await requireMember(ctx.prisma, ctx.user.id, input.teamId);
  const team = await ctx.prisma.team.findUnique({ where: { id: input.teamId }, select: { slug: true } });
  const token = crypto.randomUUID();
  await ctx.prisma.instantMeetingToken.create({
    data: {
      token,
      expires: new Date(Date.now() + 30 * 60_000),
      teamId: input.teamId,
    },
  });
  return { token, url: `/team/${team?.slug}?instant=${token}` };
}

export async function removeMemberHandler({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: { teamId: number; userId: number };
}) {
  await requireMember(ctx.prisma, ctx.user.id, input.teamId, [MembershipRole.OWNER, MembershipRole.ADMIN]);
  if (input.userId === ctx.user.id) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Use leave instead of removing yourself" });
  }
  await ctx.prisma.membership.deleteMany({
    where: { teamId: input.teamId, userId: input.userId },
  });
  return { ok: true };
}

type AvailabilitySlot = { days: number[]; start: string; end: string };

function parseTeamAvailability(metadata: unknown): AvailabilitySlot[] {
  if (!metadata || typeof metadata !== "object") {
    return [{ days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" }];
  }
  const slots = (metadata as { sharedAvailability?: AvailabilitySlot[] }).sharedAvailability;
  return slots?.length ? slots : [{ days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" }];
}

function timeToDate(value: string) {
  return new Date(`1970-01-01T${value.length === 5 ? `${value}:00` : value}.000Z`);
}

export async function getAvailabilityHandler({ ctx, input }: { ctx: Ctx; input: { teamId: number } }) {
  await requireMember(ctx.prisma, ctx.user.id, input.teamId);
  const team = await ctx.prisma.team.findUnique({
    where: { id: input.teamId },
    select: { metadata: true, timeZone: true },
  });
  return { timeZone: team?.timeZone, slots: parseTeamAvailability(team?.metadata) };
}

export async function setAvailabilityHandler({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: { teamId: number; slots: AvailabilitySlot[] };
}) {
  await requireMember(ctx.prisma, ctx.user.id, input.teamId, [MembershipRole.OWNER, MembershipRole.ADMIN]);
  const team = await ctx.prisma.team.findUnique({
    where: { id: input.teamId },
    select: { metadata: true, name: true },
  });
  const metadata =
    team?.metadata && typeof team.metadata === "object" && !Array.isArray(team.metadata)
      ? { ...(team.metadata as Record<string, unknown>), sharedAvailability: input.slots }
      : { sharedAvailability: input.slots };
  await ctx.prisma.team.update({
    where: { id: input.teamId },
    data: { metadata },
  });
  const schedule = await ctx.prisma.schedule.create({
    data: {
      name: `Team shared: ${team?.name || input.teamId}`,
      userId: ctx.user.id,
      availability: {
        create: input.slots.map((slot) => ({
          days: slot.days,
          startTime: timeToDate(slot.start),
          endTime: timeToDate(slot.end),
        })),
      },
    },
  });
  await ctx.prisma.host.updateMany({
    where: { eventType: { teamId: input.teamId } },
    data: { scheduleId: schedule.id },
  });
  return { ok: true, scheduleId: schedule.id };
}

export async function setHostsHandler({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: { eventTypeId: number; hosts: { userId: number; isFixed?: boolean; groupName?: string }[] };
}) {
  const eventType = await ctx.prisma.eventType.findUnique({
    where: { id: input.eventTypeId },
    select: { teamId: true, schedulingType: true },
  });
  if (!eventType?.teamId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Not a team event type" });
  }
  await requireMember(ctx.prisma, ctx.user.id, eventType.teamId, [MembershipRole.OWNER, MembershipRole.ADMIN]);
  await ctx.prisma.host.deleteMany({ where: { eventTypeId: input.eventTypeId } });
  const groupIds = new Map<string, string>();
  for (const host of input.hosts) {
    if (host.groupName && !groupIds.has(host.groupName)) {
      const group = await ctx.prisma.hostGroup.create({
        data: { name: host.groupName, eventTypeId: input.eventTypeId },
      });
      groupIds.set(host.groupName, group.id);
    }
    const member = await ctx.prisma.membership.findFirst({
      where: { teamId: eventType.teamId, userId: host.userId },
      select: { id: true },
    });
    await ctx.prisma.host.create({
      data: {
        userId: host.userId,
        eventTypeId: input.eventTypeId,
        isFixed: host.isFixed ?? eventType.schedulingType === "COLLECTIVE",
        groupId: host.groupName ? groupIds.get(host.groupName) : undefined,
        memberId: member?.id,
      },
    });
  }
  return { ok: true };
}
