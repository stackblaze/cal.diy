import { MembershipRole, BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import { prisma } from "@calcom/prisma";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { McpUser } from "./auth";

type Args = Record<string, unknown>;

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function num(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("Expected a number");
  return n;
}

function str(value: unknown) {
  return String(value ?? "");
}

async function ownedEventType(user: McpUser, id: number) {
  const eventType = await prisma.eventType.findFirst({
    where: {
      id,
      OR: [{ userId: user.id }, { team: { members: { some: { userId: user.id, accepted: true } } } }],
    },
  });
  if (!eventType) throw new Error("Event type not found");
  return eventType;
}

async function resolveEventTypeId(user: McpUser, args: Args) {
  if (args.eventTypeId) return num(args.eventTypeId);
  const slug = str(args.eventTypeSlug);
  if (args.teamSlug && slug) {
    const eventType = await prisma.eventType.findFirst({
      where: { slug, team: { slug: str(args.teamSlug) } },
      select: { id: true },
    });
    if (!eventType) throw new Error("Team event type not found");
    return eventType.id;
  }
  if ((args.username || user.username) && slug) {
    const eventType = await prisma.eventType.findFirst({
      where: { slug, owner: { username: str(args.username || user.username) } },
      select: { id: true },
    });
    if (!eventType) throw new Error("Event type not found");
    return eventType.id;
  }
  throw new Error("Provide eventTypeId, or eventTypeSlug + username, or eventTypeSlug + teamSlug");
}

async function requireOrgId(user: McpUser) {
  if (!user.organizationId) throw new Error("User is not in an organization");
  return user.organizationId;
}

export async function runMcpTool(name: string, args: Args, user: McpUser) {
  switch (name) {
    case "get_me":
      return text(user);
    case "update_me": {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: args.name ? str(args.name) : undefined,
          timeZone: args.timeZone ? str(args.timeZone) : undefined,
          weekStart: args.weekStart ? str(args.weekStart) : undefined,
          bio: args.bio !== undefined ? str(args.bio) : undefined,
        },
        select: { id: true, name: true, email: true, username: true, timeZone: true, weekStart: true, bio: true },
      });
      return text(updated);
    }
    case "get_event_types": {
      const where = args.teamSlug
        ? { team: { slug: str(args.teamSlug) } }
        : args.username
          ? { owner: { username: str(args.username) } }
          : {
              OR: [{ userId: user.id }, { team: { members: { some: { userId: user.id, accepted: true } } } }],
            };
      const rows = await prisma.eventType.findMany({
        where: args.eventSlug ? { ...where, slug: str(args.eventSlug) } : where,
        select: {
          id: true,
          title: true,
          slug: true,
          length: true,
          hidden: true,
          schedulingType: true,
          teamId: true,
          userId: true,
        },
        take: 100,
      });
      return text(rows);
    }
    case "get_event_type":
      return text(await ownedEventType(user, num(args.id)));
    case "create_event_type": {
      const length = num(args.lengthInMinutes);
      const created = await prisma.eventType.create({
        data: {
          title: str(args.title),
          slug: str(args.slug),
          length,
          description: args.description ? str(args.description) : undefined,
          owner: args.teamId ? undefined : { connect: { id: user.id } },
          users: args.teamId ? undefined : { connect: { id: user.id } },
          team: args.teamId ? { connect: { id: num(args.teamId) } } : undefined,
          schedulingType: args.schedulingType ? (str(args.schedulingType) as SchedulingType) : undefined,
        },
      });
      return text(created);
    }
    case "update_event_type": {
      await ownedEventType(user, num(args.id));
      const updated = await prisma.eventType.update({
        where: { id: num(args.id) },
        data: {
          title: args.title ? str(args.title) : undefined,
          slug: args.slug ? str(args.slug) : undefined,
          length: args.lengthInMinutes ? num(args.lengthInMinutes) : undefined,
          hidden: typeof args.hidden === "boolean" ? args.hidden : undefined,
          description: args.description !== undefined ? str(args.description) : undefined,
        },
      });
      return text(updated);
    }
    case "delete_event_type": {
      await ownedEventType(user, num(args.id));
      await prisma.eventType.delete({ where: { id: num(args.id) } });
      return text({ ok: true });
    }
    case "get_scheduling_config": {
      const eventType = await ownedEventType(user, num(args.eventTypeId));
      const hosts = await prisma.host.findMany({
        where: { eventTypeId: eventType.id },
        include: { user: { select: { id: true, name: true, email: true, username: true } }, group: true },
      });
      const groups = await prisma.hostGroup.findMany({ where: { eventTypeId: eventType.id } });
      return text({ schedulingType: eventType.schedulingType, hosts, hostGroups: groups });
    }
    case "get_bookings": {
      const take = Math.min(num(args.take ?? 100), 250);
      const skip = num(args.skip ?? 0);
      const now = new Date();
      const status = str(args.status || "upcoming");
      const where = {
        OR: [{ userId: user.id }, { attendees: { some: { email: user.email } } }],
        ...(args.eventTypeId ? { eventTypeId: num(args.eventTypeId) } : {}),
        ...(args.attendeeEmail ? { attendees: { some: { email: str(args.attendeeEmail) } } } : {}),
        ...(args.afterStart ? { startTime: { gte: new Date(str(args.afterStart)) } } : {}),
        ...(args.beforeEnd ? { endTime: { lte: new Date(str(args.beforeEnd)) } } : {}),
        ...(status === "cancelled"
          ? { status: BookingStatus.CANCELLED }
          : status === "unconfirmed"
            ? { status: BookingStatus.PENDING }
            : status === "past"
              ? { startTime: { lt: now }, status: { not: BookingStatus.CANCELLED } }
              : { startTime: { gte: now }, status: { not: BookingStatus.CANCELLED } }),
      };
      const rows = await prisma.booking.findMany({
        where,
        include: { attendees: true, eventType: { select: { title: true, slug: true } } },
        orderBy: { startTime: "asc" },
        take,
        skip,
      });
      return text(rows);
    }
    case "get_booking": {
      const booking = await prisma.booking.findUnique({
        where: { uid: str(args.uid) },
        include: { attendees: true, eventType: true },
      });
      if (!booking) throw new Error("Booking not found");
      return text(booking);
    }
    case "create_booking": {
      const eventTypeId = await resolveEventTypeId(user, args);
      const attendee = (args.attendee || {}) as { name?: string; email?: string; timeZone?: string };
      if (!attendee.email || !attendee.name) throw new Error("attendee.name and attendee.email are required");
      const { getRegularBookingService } = await import(
        "@calcom/features/bookings/di/RegularBookingService.container"
      );
      const service = getRegularBookingService();
      const created = await service.createBooking({
        bookingData: {
          eventTypeId,
          start: str(args.start),
          timeZone: attendee.timeZone || user.timeZone,
          language: "en",
          metadata: {},
          responses: { name: attendee.name, email: attendee.email },
        } as never,
        bookingMeta: { userId: user.id },
      });
      return text(created);
    }
    case "reschedule_booking": {
      const existing = await prisma.booking.findUnique({ where: { uid: str(args.uid) } });
      if (!existing?.eventTypeId) throw new Error("Booking not found");
      const { getRegularBookingService } = await import(
        "@calcom/features/bookings/di/RegularBookingService.container"
      );
      const service = getRegularBookingService();
      const updated = await service.rescheduleBooking({
        bookingData: {
          eventTypeId: existing.eventTypeId,
          start: str(args.start),
          rescheduleUid: str(args.uid),
          rescheduledBy: args.rescheduledBy ? str(args.rescheduledBy) : user.email,
          timeZone: user.timeZone,
          language: "en",
          metadata: {},
          responses: { name: user.name || user.email, email: user.email },
        } as never,
        bookingMeta: { userId: user.id },
      });
      return text(updated);
    }
    case "cancel_booking": {
      const handleCancelBooking = (await import("@calcom/features/bookings/lib/handleCancelBooking")).default;
      const result = await handleCancelBooking({
        bookingData: {
          uid: str(args.uid),
          cancellationReason: args.cancellationReason ? str(args.cancellationReason) : "Cancelled via MCP",
        },
        userId: user.id,
      });
      return text(result);
    }
    case "confirm_booking": {
      const booking = await prisma.booking.findUnique({ where: { uid: str(args.uid) } });
      if (!booking || booking.userId !== user.id) throw new Error("Booking not found");
      const updated = await prisma.booking.update({
        where: { uid: str(args.uid) },
        data: { status: BookingStatus.ACCEPTED },
      });
      return text(updated);
    }
    case "mark_booking_absent": {
      const booking = await prisma.booking.findUnique({
        where: { uid: str(args.uid) },
        include: { attendees: true },
      });
      if (!booking) throw new Error("Booking not found");
      if (args.host) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { noShowHost: true },
        }).catch(() => undefined);
      }
      if (args.attendeeEmail) {
        await prisma.attendee.updateMany({
          where: { bookingId: booking.id, email: str(args.attendeeEmail) },
          data: { noShow: true },
        });
      }
      return text({ ok: true });
    }
    case "get_booking_attendees": {
      const booking = await prisma.booking.findUnique({
        where: { uid: str(args.uid) },
        include: { attendees: true },
      });
      return text(booking?.attendees || []);
    }
    case "add_booking_attendee": {
      const booking = await prisma.booking.findUnique({ where: { uid: str(args.uid) } });
      if (!booking) throw new Error("Booking not found");
      const attendee = await prisma.attendee.create({
        data: {
          bookingId: booking.id,
          name: str(args.name),
          email: str(args.email),
          timeZone: str(args.timeZone),
        },
      });
      return text(attendee);
    }
    case "get_booking_attendee": {
      const attendee = await prisma.attendee.findFirst({
        where: { id: num(args.attendeeId), booking: { uid: str(args.uid) } },
      });
      if (!attendee) throw new Error("Attendee not found");
      return text(attendee);
    }
    case "get_schedules":
      return text(await prisma.schedule.findMany({ where: { userId: user.id }, include: { availability: true } }));
    case "get_schedule": {
      const schedule = await prisma.schedule.findFirst({
        where: { id: num(args.id), userId: user.id },
        include: { availability: true },
      });
      if (!schedule) throw new Error("Schedule not found");
      return text(schedule);
    }
    case "create_schedule": {
      const schedule = await prisma.schedule.create({
        data: {
          name: str(args.name),
          timeZone: str(args.timeZone),
          userId: user.id,
          availability: {
            create: { days: [1, 2, 3, 4, 5], startTime: new Date("1970-01-01T09:00:00.000Z"), endTime: new Date("1970-01-01T17:00:00.000Z") },
          },
        },
      });
      if (args.isDefault) {
        await prisma.user.update({ where: { id: user.id }, data: { defaultScheduleId: schedule.id } });
      }
      return text(schedule);
    }
    case "update_schedule": {
      const schedule = await prisma.schedule.update({
        where: { id: num(args.id) },
        data: {
          name: args.name ? str(args.name) : undefined,
          timeZone: args.timeZone ? str(args.timeZone) : undefined,
        },
      });
      return text(schedule);
    }
    case "delete_schedule": {
      await prisma.schedule.delete({ where: { id: num(args.id) } });
      return text({ ok: true });
    }
    case "get_default_schedule": {
      if (!user.defaultScheduleId) return text(null);
      return text(
        await prisma.schedule.findUnique({ where: { id: user.defaultScheduleId }, include: { availability: true } })
      );
    }
    case "get_availability": {
      const eventTypeId = await resolveEventTypeId(user, args);
      const start = str(args.start || new Date().toISOString());
      const end = str(args.end || new Date(Date.now() + 7 * 86400000).toISOString());
      const { getAvailableSlotsService } = await import("@calcom/features/di/containers/AvailableSlots");
      const service = getAvailableSlotsService();
      const slots = await service.getAvailableSlots({
        ctx: {},
        input: {
          eventTypeId,
          startTime: start,
          endTime: end,
          timeZone: str(args.timeZone || user.timeZone),
          isTeamEvent: !!args.teamSlug,
          usernameList: args.username ? [str(args.username)] : user.username ? [user.username] : undefined,
        },
      });
      return text(slots);
    }
    case "get_connected_calendars": {
      const calendars = await prisma.selectedCalendar.findMany({
        where: { userId: user.id },
        select: { id: true, integration: true, externalId: true, credentialId: true },
      });
      const destination = await prisma.destinationCalendar.findFirst({
        where: { userId: user.id },
        select: { integration: true, externalId: true },
      });
      return text({ calendars, destination });
    }
    case "get_busy_times": {
      const from = new Date(str(args.dateFrom));
      const to = new Date(str(args.dateTo));
      const bookings = await prisma.booking.findMany({
        where: {
          userId: user.id,
          status: { not: BookingStatus.CANCELLED },
          startTime: { gte: from },
          endTime: { lte: new Date(to.getTime() + 86400000) },
        },
        select: { startTime: true, endTime: true, title: true, uid: true },
      });
      return text(bookings.map((row) => ({ start: row.startTime, end: row.endTime, title: row.title, uid: row.uid })));
    }
    case "get_conferencing_apps": {
      const rows = await prisma.credential.findMany({
        where: { userId: user.id },
        select: { id: true, type: true, appId: true },
      });
      return text(rows.filter((row) => /video|zoom|meet|daily|conferenc/i.test(`${row.type} ${row.appId}`)));
    }
    case "get_booking_routing_trace": {
      const booking = await prisma.booking.findUnique({ where: { uid: str(args.uid) }, select: { id: true, userId: true } });
      if (!booking) throw new Error("Booking not found");
      const response = await prisma.extRoutingFormResponse.findFirst({
        where: { OR: [{ assignedUserId: booking.userId }] },
        orderBy: { createdAt: "desc" },
      });
      return text(response);
    }
    case "calculate_routing_form_slots": {
      const form = await prisma.extRoutingForm.findUnique({ where: { id: num(args.routingFormId) } });
      if (!form) throw new Error("Routing form not found");
      const answers = (args.answers || {}) as Record<string, string>;
      const routes = (form.routes as { field: string; equals: string; userId?: number; teamId?: number; eventTypeId?: number }[]) || [];
      const match = routes.find((route) => answers[route.field] === route.equals);
      await prisma.extRoutingFormResponse.create({
        data: {
          formId: form.id,
          answers,
          assignedUserId: match?.userId ?? null,
          assignedTeamId: match?.teamId ?? form.teamId ?? null,
        },
      });
      return text({ assignedUserId: match?.userId ?? null, assignedTeamId: match?.teamId ?? form.teamId, eventTypeId: match?.eventTypeId ?? null });
    }
    case "get_my_teams":
      return text(
        await prisma.team.findMany({
          where: { members: { some: { userId: user.id } } },
          select: { id: true, name: true, slug: true, isOrganization: true, parentId: true },
        })
      );
    case "get_org_teams": {
      const orgId = await requireOrgId(user);
      return text(await prisma.team.findMany({ where: { parentId: orgId }, select: { id: true, name: true, slug: true } }));
    }
    case "get_team_memberships":
      return text(
        await prisma.membership.findMany({
          where: { teamId: num(args.teamId) },
          include: { user: { select: { id: true, name: true, email: true, username: true } } },
        })
      );
    case "get_team_membership":
      return text(
        await prisma.membership.findFirst({
          where: { teamId: num(args.teamId), userId: num(args.userId) },
          include: { user: { select: { id: true, name: true, email: true } } },
        })
      );
    case "create_team_invite": {
      const { inviteHandler } = await import("@calcom/trpc/server/routers/viewer/teams/handlers");
      return text(
        await inviteHandler({
          ctx: { user: { id: user.id } as never, prisma },
          input: { teamId: num(args.teamId), email: str(args.email), role: (args.role as "MEMBER") || "MEMBER" },
        })
      );
    }
    case "create_team_membership": {
      const membership = await prisma.membership.upsert({
        where: { userId_teamId: { userId: num(args.userId), teamId: num(args.teamId) } },
        create: {
          userId: num(args.userId),
          teamId: num(args.teamId),
          role: (str(args.role || "MEMBER") as MembershipRole) || MembershipRole.MEMBER,
          accepted: true,
        },
        update: { accepted: true },
      });
      return text(membership);
    }
    case "update_team_membership": {
      const membership = await prisma.membership.update({
        where: { userId_teamId: { userId: num(args.userId), teamId: num(args.teamId) } },
        data: {
          role: args.role ? (str(args.role) as MembershipRole) : undefined,
          accepted: typeof args.accepted === "boolean" ? args.accepted : undefined,
        },
      });
      return text(membership);
    }
    case "delete_team_membership": {
      await prisma.membership.delete({
        where: { userId_teamId: { userId: num(args.userId), teamId: num(args.teamId) } },
      });
      return text({ ok: true });
    }
    case "get_org_memberships": {
      const orgId = await requireOrgId(user);
      return text(
        await prisma.membership.findMany({
          where: { teamId: orgId },
          include: { user: { select: { id: true, name: true, email: true } } },
        })
      );
    }
    case "create_org_membership": {
      const orgId = await requireOrgId(user);
      const { inviteHandler } = await import("@calcom/trpc/server/routers/viewer/teams/handlers");
      return text(
        await inviteHandler({
          ctx: { user: { id: user.id } as never, prisma },
          input: { teamId: orgId, email: str(args.email), role: (args.role as "MEMBER") || "MEMBER" },
        })
      );
    }
    case "get_org_membership": {
      const orgId = await requireOrgId(user);
      return text(await prisma.membership.findFirst({ where: { teamId: orgId, userId: num(args.userId) } }));
    }
    case "update_org_membership": {
      const orgId = await requireOrgId(user);
      return text(
        await prisma.membership.update({
          where: { userId_teamId: { userId: num(args.userId), teamId: orgId } },
          data: { role: args.role ? (str(args.role) as MembershipRole) : undefined },
        })
      );
    }
    case "delete_org_membership": {
      const orgId = await requireOrgId(user);
      await prisma.membership.delete({ where: { userId_teamId: { userId: num(args.userId), teamId: orgId } } });
      return text({ ok: true });
    }
    case "get_org_attributes": {
      const orgId = await requireOrgId(user);
      return text(await prisma.attribute.findMany({ where: { teamId: orgId }, include: { options: true } }));
    }
    case "get_org_attribute":
      return text(await prisma.attribute.findUnique({ where: { id: str(args.id) }, include: { options: true } }));
    case "get_attribute_options":
      return text(await prisma.attributeOption.findMany({ where: { attributeId: str(args.attributeId) } }));
    case "get_user_attributes": {
      const orgId = await requireOrgId(user);
      const membership = await prisma.membership.findFirst({ where: { teamId: orgId, userId: num(args.userId) } });
      if (!membership) return text([]);
      return text(await prisma.attributeToUser.findMany({ where: { memberId: membership.id }, include: { attributeOption: true } }));
    }
    case "assign_attribute_to_user": {
      const orgId = await requireOrgId(user);
      const membership = await prisma.membership.findFirst({ where: { teamId: orgId, userId: num(args.userId) } });
      if (!membership) throw new Error("User is not in the organization");
      let optionId = args.attributeOptionId ? str(args.attributeOptionId) : "";
      if (!optionId && args.value) {
        const option = await prisma.attributeOption.create({
          data: {
            attributeId: str(args.attributeId),
            value: str(args.value),
            slug: str(args.value).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          },
        });
        optionId = option.id;
      }
      if (!optionId) throw new Error("attributeOptionId or value required");
      const assigned = await prisma.attributeToUser.create({
        data: { memberId: membership.id, attributeOptionId: optionId },
      });
      return text(assigned);
    }
    case "update_user_attribute": {
      const orgId = await requireOrgId(user);
      const membership = await prisma.membership.findFirst({ where: { teamId: orgId, userId: num(args.userId) } });
      if (!membership) throw new Error("User is not in the organization");
      const updated = await prisma.attributeToUser.updateMany({
        where: { memberId: membership.id, attributeOptionId: str(args.attributeOptionId) },
        data: { weight: args.weight !== undefined ? num(args.weight) : undefined },
      });
      return text(updated);
    }
    case "unassign_attribute_from_user": {
      const orgId = await requireOrgId(user);
      const membership = await prisma.membership.findFirst({ where: { teamId: orgId, userId: num(args.userId) } });
      if (!membership) throw new Error("User is not in the organization");
      await prisma.attributeToUser.deleteMany({
        where: { memberId: membership.id, attributeOptionId: str(args.attributeOptionId) },
      });
      return text({ ok: true });
    }
    case "get_org_routing_forms": {
      const teamIds = (
        await prisma.membership.findMany({ where: { userId: user.id, accepted: true }, select: { teamId: true } })
      ).map((row) => row.teamId);
      return text(
        await prisma.extRoutingForm.findMany({
          where: { OR: [{ userId: user.id }, { teamId: { in: teamIds } }] },
        })
      );
    }
    case "get_org_routing_form_responses":
      return text(await prisma.extRoutingFormResponse.findMany({ where: { formId: num(args.formId) }, take: 100 }));
    case "get_app_link": {
      const base = WEBAPP_URL || "";
      if (args.kind === "booking") return text({ url: `${base}/booking/${str(args.uid)}` });
      if (args.kind === "eventType") return text({ url: `${base}/event-types/${num(args.eventTypeId)}` });
      if (args.kind === "team") return text({ url: `${base}/team/${str(args.teamSlug)}` });
      if (args.kind === "routingForm") return text({ url: `${base}/r/${num(args.formId)}` });
      return text({ url: `${base}${str(args.path || "/settings/my-account/profile")}` });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
