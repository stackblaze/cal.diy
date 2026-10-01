import { z } from "zod";

import authedProcedure from "../../../procedures/authedProcedure";
import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";

export const routingFormsRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const teamIds = (
      await ctx.prisma.membership.findMany({
        where: { userId: ctx.user.id, accepted: true },
        select: { teamId: true },
      })
    ).map((m) => m.teamId);
    return ctx.prisma.extRoutingForm.findMany({
      where: {
        OR: [{ userId: ctx.user.id }, { teamId: { in: teamIds } }],
      },
      include: { _count: { select: { responses: true } } },
      orderBy: { id: "desc" },
    });
  }),
  create: authedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        teamId: z.number().optional(),
        fields: z.array(z.object({ name: z.string(), type: z.string() })).default([]),
        routes: z
          .array(
            z.object({
              field: z.string(),
              equals: z.string(),
              userId: z.number().optional(),
              teamId: z.number().optional(),
              eventTypeId: z.number().optional(),
            })
          )
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.extRoutingForm.create({
        data: {
          name: input.name,
          userId: ctx.user.id,
          teamId: input.teamId,
          fields: input.fields,
          routes: input.routes,
        },
      });
    }),
  getPublic: publicProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    return ctx.prisma.extRoutingForm.findUnique({
      where: { id: input.id },
      select: { id: true, name: true, fields: true },
    });
  }),
  submit: publicProcedure
    .input(z.object({ formId: z.number(), answers: z.record(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const form = await ctx.prisma.extRoutingForm.findUnique({ where: { id: input.formId } });
      if (!form) return { assignedUserId: null, assignedTeamId: null, eventTypeId: null };
      const routes = (form.routes as { field: string; equals: string; userId?: number; teamId?: number; eventTypeId?: number }[]) || [];
      const match = routes.find((route) => input.answers[route.field] === route.equals);
      const assignedUserId = match?.userId ?? null;
      const assignedTeamId = match?.teamId ?? form.teamId ?? null;
      const eventTypeId = match?.eventTypeId ?? null;
      await ctx.prisma.extRoutingFormResponse.create({
        data: {
          formId: form.id,
          answers: input.answers,
          assignedUserId,
          assignedTeamId,
        },
      });
      let redirectUrl: string | null = null;
      if (eventTypeId) {
        const eventType = await ctx.prisma.eventType.findUnique({
          where: { id: eventTypeId },
          select: { slug: true, team: { select: { slug: true } }, owner: { select: { username: true } } },
        });
        if (eventType?.team?.slug) redirectUrl = `/team/${eventType.team.slug}/${eventType.slug}`;
        else if (eventType?.owner?.username) redirectUrl = `/${eventType.owner.username}/${eventType.slug}`;
      } else if (assignedUserId) {
        const user = await ctx.prisma.user.findUnique({
          where: { id: assignedUserId },
          select: { username: true },
        });
        if (user?.username) redirectUrl = `/${user.username}`;
      } else if (assignedTeamId) {
        const team = await ctx.prisma.team.findUnique({
          where: { id: assignedTeamId },
          select: { slug: true },
        });
        if (team?.slug) redirectUrl = `/team/${team.slug}`;
      }
      return { assignedUserId, assignedTeamId, eventTypeId, redirectUrl };
    }),
  delete: authedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    await ctx.prisma.extRoutingForm.deleteMany({ where: { id: input.id, userId: ctx.user.id } });
    return { ok: true };
  }),
});
