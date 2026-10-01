import { z } from "zod";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

export const insightsRouter = router({
  bookings: authedProcedure
    .input(z.object({ teamId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where = input?.teamId
        ? { eventType: { teamId: input.teamId } }
        : {
            OR: [
              { userId: ctx.user.id },
              { eventType: { team: { members: { some: { userId: ctx.user.id, accepted: true } } } } },
            ],
          };
      const [total, byStatus] = await Promise.all([
        ctx.prisma.booking.count({ where }),
        ctx.prisma.booking.groupBy({
          by: ["status"],
          where,
          _count: { _all: true },
        }),
      ]);
      return {
        total,
        byStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
      };
    }),
  audit: authedProcedure
    .input(z.object({ take: z.number().min(1).max(100).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.bookingAudit.findMany({
        take: input?.take ?? 50,
        orderBy: { createdAt: "desc" },
      });
    }),
});
