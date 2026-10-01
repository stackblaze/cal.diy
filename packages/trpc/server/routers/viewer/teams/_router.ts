import { z } from "zod";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

const teamIdInput = z.object({ teamId: z.number() });

export const teamsRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const { listHandler } = await import("./handlers");
    return listHandler({ ctx });
  }),
  get: authedProcedure.input(teamIdInput).query(async ({ ctx, input }) => {
    const { getHandler } = await import("./handlers");
    return getHandler({ ctx, input });
  }),
  create: authedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1).optional(),
        bio: z.string().optional(),
        isOrganization: z.boolean().optional(),
        parentId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { createHandler } = await import("./handlers");
      return createHandler({ ctx, input });
    }),
  update: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        bio: z.string().optional(),
        hideBranding: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { updateHandler } = await import("./handlers");
      return updateHandler({ ctx, input });
    }),
  delete: authedProcedure.input(teamIdInput).mutation(async ({ ctx, input }) => {
    const { deleteHandler } = await import("./handlers");
    return deleteHandler({ ctx, input });
  }),
  invite: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
        email: z.string().email(),
        role: z.enum(["MEMBER", "ADMIN", "OWNER"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { inviteHandler } = await import("./handlers");
      return inviteHandler({ ctx, input });
    }),
  accept: authedProcedure.input(teamIdInput).mutation(async ({ ctx, input }) => {
    const { acceptHandler } = await import("./handlers");
    return acceptHandler({ ctx, input });
  }),
  removeMember: authedProcedure
    .input(z.object({ teamId: z.number(), userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { removeMemberHandler } = await import("./handlers");
      return removeMemberHandler({ ctx, input });
    }),
  createInstant: authedProcedure.input(teamIdInput).mutation(async ({ ctx, input }) => {
    const { createInstantHandler } = await import("./handlers");
    return createInstantHandler({ ctx, input });
  }),
  getAvailability: authedProcedure.input(teamIdInput).query(async ({ ctx, input }) => {
    const { getAvailabilityHandler } = await import("./handlers");
    return getAvailabilityHandler({ ctx, input });
  }),
  setAvailability: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
        slots: z.array(
          z.object({
            days: z.array(z.number().min(0).max(6)),
            start: z.string(),
            end: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { setAvailabilityHandler } = await import("./handlers");
      return setAvailabilityHandler({ ctx, input });
    }),
  setHosts: authedProcedure
    .input(
      z.object({
        eventTypeId: z.number(),
        hosts: z.array(
          z.object({
            userId: z.number(),
            isFixed: z.boolean().optional(),
            groupName: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { setHostsHandler } = await import("./handlers");
      return setHostsHandler({ ctx, input });
    }),
});
