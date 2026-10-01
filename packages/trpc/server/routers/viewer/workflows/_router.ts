import { z } from "zod";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

export const workflowsRouter = router({
  list: authedProcedure
    .input(z.object({ teamId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const teamIds = (
        await ctx.prisma.membership.findMany({
          where: { userId: ctx.user.id, accepted: true },
          select: { teamId: true },
        })
      ).map((m) => m.teamId);
      return ctx.prisma.extWorkflow.findMany({
        where: input?.teamId
          ? { teamId: input.teamId }
          : { OR: [{ userId: ctx.user.id }, { teamId: { in: teamIds } }] },
        include: { steps: true },
        orderBy: { id: "desc" },
      });
    }),
  create: authedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        teamId: z.number().optional(),
        trigger: z.enum(["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED", "BOOKING_ENDED"]),
        eventTypeId: z.number().optional(),
        steps: z
          .array(
            z.object({
              action: z.enum(["EMAIL_HOST", "EMAIL_ATTENDEE", "SMS_ATTENDEE"]),
              template: z.string().min(1),
            })
          )
          .min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.extWorkflow.create({
        data: {
          name: input.name,
          trigger: input.trigger,
          userId: ctx.user.id,
          teamId: input.teamId,
          eventTypeId: input.eventTypeId,
          steps: { create: input.steps },
        },
        include: { steps: true },
      });
    }),
  delete: authedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    await ctx.prisma.extWorkflow.deleteMany({
      where: { id: input.id, userId: ctx.user.id },
    });
    return { ok: true };
  }),
});
