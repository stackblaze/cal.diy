import { z } from "zod";

import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import authedProcedure from "../../../procedures/authedProcedure";
import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

export const organizationsRouter = router({
  mine: authedProcedure.query(async ({ ctx }) => {
    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.user.id, accepted: true, team: { isOrganization: true } },
      include: { team: { include: { organizationSettings: true, children: true } } },
    });
    return membership?.team ?? null;
  }),
  create: authedProcedure
    .input(z.object({ name: z.string().min(1), slug: z.string().min(1).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { createHandler } = await import("../teams/handlers");
      return createHandler({ ctx, input: { ...input, isOrganization: true } });
    }),
  update: authedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        orgAutoAcceptEmail: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          teamId: input.organizationId,
          accepted: true,
          role: { in: [MembershipRole.OWNER, MembershipRole.ADMIN] },
        },
      });
      if (!membership) throw new TRPCError({ code: "UNAUTHORIZED" });
      await ctx.prisma.team.update({
        where: { id: input.organizationId },
        data: { name: input.name, slug: input.slug },
      });
      if (input.orgAutoAcceptEmail) {
        await ctx.prisma.organizationSettings.update({
          where: { organizationId: input.organizationId },
          data: { orgAutoAcceptEmail: input.orgAutoAcceptEmail },
        });
      }
      return { ok: true };
    }),
  attributes: authedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.attribute.findMany({
        where: { teamId: input.organizationId },
        include: { options: true },
      });
    }),
  createAttribute: authedProcedure
    .input(z.object({ organizationId: z.number(), name: z.string().min(1), type: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return ctx.prisma.attribute.create({
        data: {
          name: input.name,
          slug,
          type: "TEXT",
          teamId: input.organizationId,
        },
      });
    }),
  impersonate: authedAdminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, email: true, username: true },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      const token = crypto.randomUUID();
      await ctx.prisma.verificationToken.create({
        data: {
          identifier: `impersonate:${ctx.user.id}:${target.id}`,
          token,
          expires: new Date(Date.now() + 60_000),
        },
      });
      return { token, email: target.email };
    }),
  listRoles: authedProcedure.input(z.object({ organizationId: z.number() })).query(async ({ ctx, input }) => {
    return ctx.prisma.role.findMany({
      where: { teamId: input.organizationId },
      include: { permissions: true },
    });
  }),
  createRole: authedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1),
        permissions: z.array(z.object({ resource: z.string(), action: z.string() })).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          teamId: input.organizationId,
          accepted: true,
          role: { in: [MembershipRole.OWNER, MembershipRole.ADMIN] },
        },
      });
      if (!membership) throw new TRPCError({ code: "UNAUTHORIZED" });
      return ctx.prisma.role.create({
        data: {
          name: input.name,
          teamId: input.organizationId,
          permissions: { create: input.permissions },
        },
        include: { permissions: true },
      });
    }),
  createSubTeam: authedProcedure
    .input(z.object({ organizationId: z.number(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { createHandler } = await import("../teams/handlers");
      return createHandler({
        ctx,
        input: { name: input.name, parentId: input.organizationId },
      });
    }),
  dsync: authedProcedure.input(z.object({ organizationId: z.number() })).query(async ({ ctx, input }) => {
    return ctx.prisma.dSyncData.findFirst({
      where: { organizationId: input.organizationId },
      include: { teamGroupMapping: true },
    });
  }),
  enableDsync: authedProcedure
    .input(z.object({ organizationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.organizationSettings.upsert({
        where: { organizationId: input.organizationId },
        create: { organizationId: input.organizationId, orgAutoAcceptEmail: "" },
        update: {},
      });
      return ctx.prisma.dSyncData.upsert({
        where: { organizationId: input.organizationId },
        create: {
          directoryId: `dir-${input.organizationId}`,
          tenant: `org-${input.organizationId}`,
          organizationId: input.organizationId,
        },
        update: {},
      });
    }),
  delegationCredentials: authedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.delegationCredential.findMany({
        where: { organizationId: input.organizationId },
        select: { id: true, domain: true, enabled: true, createdAt: true },
      });
    }),
});
