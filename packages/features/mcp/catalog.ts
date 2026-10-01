export type McpToolDef = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
};

const RO = { readOnlyHint: true, openWorldHint: true };
const CR = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };
const UP = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const DE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true };

const empty = { type: "object", properties: {} };

export const MCP_TOOLS: McpToolDef[] = [
  {
    name: "get_me",
    title: "Get My Profile",
    description: "Get the authenticated user's profile including username, email, time zone, and organizationId.",
    inputSchema: empty,
    annotations: RO,
  },
  {
    name: "update_me",
    title: "Update My Profile",
    description: "Update name, timeZone, weekStart, or bio.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        timeZone: { type: "string" },
        weekStart: { type: "string" },
        bio: { type: "string" },
      },
    },
    annotations: UP,
  },
  {
    name: "get_event_types",
    title: "List Event Types",
    description: "List event types for the authenticated user, or another username / team slug.",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string" },
        eventSlug: { type: "string" },
        teamSlug: { type: "string" },
      },
    },
    annotations: RO,
  },
  {
    name: "get_event_type",
    title: "Get Event Type",
    description: "Get an event type by numeric ID.",
    inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
    annotations: RO,
  },
  {
    name: "create_event_type",
    title: "Create Event Type",
    description: "Create an event type. Required: title, slug, lengthInMinutes.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        slug: { type: "string" },
        lengthInMinutes: { type: "number" },
        teamId: { type: "number" },
        schedulingType: { type: "string", enum: ["ROUND_ROBIN", "COLLECTIVE", "MANAGED"] },
        description: { type: "string" },
      },
      required: ["title", "slug", "lengthInMinutes"],
    },
    annotations: CR,
  },
  {
    name: "update_event_type",
    title: "Update Event Type",
    description: "Update an event type by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        title: { type: "string" },
        slug: { type: "string" },
        lengthInMinutes: { type: "number" },
        hidden: { type: "boolean" },
        description: { type: "string" },
      },
      required: ["id"],
    },
    annotations: UP,
  },
  {
    name: "delete_event_type",
    title: "Delete Event Type",
    description: "Permanently delete an event type by ID.",
    inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
    annotations: DE,
  },
  {
    name: "get_scheduling_config",
    title: "Get Scheduling Config",
    description: "Hosts, host groups, and scheduling type for a team event type.",
    inputSchema: { type: "object", properties: { eventTypeId: { type: "number" } }, required: ["eventTypeId"] },
    annotations: RO,
  },
  {
    name: "get_bookings",
    title: "List Bookings",
    description: "List bookings. Filter by status (upcoming, past, cancelled, unconfirmed), attendee email, eventTypeId, take/skip.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string" },
        attendeeEmail: { type: "string" },
        eventTypeId: { type: "number" },
        take: { type: "number" },
        skip: { type: "number" },
        afterStart: { type: "string" },
        beforeEnd: { type: "string" },
      },
    },
    annotations: RO,
  },
  {
    name: "get_booking",
    title: "Get Booking",
    description: "Get a booking by UID.",
    inputSchema: { type: "object", properties: { uid: { type: "string" } }, required: ["uid"] },
    annotations: RO,
  },
  {
    name: "create_booking",
    title: "Create Booking",
    description:
      "Create a booking. Use get_availability first. Identify event type by eventTypeId, or eventTypeSlug + username, or eventTypeSlug + teamSlug. start must be UTC ISO 8601. attendee needs name, email, timeZone.",
    inputSchema: {
      type: "object",
      properties: {
        eventTypeId: { type: "number" },
        eventTypeSlug: { type: "string" },
        username: { type: "string" },
        teamSlug: { type: "string" },
        start: { type: "string" },
        attendee: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            timeZone: { type: "string" },
          },
        },
      },
      required: ["start", "attendee"],
    },
    annotations: CR,
  },
  {
    name: "reschedule_booking",
    title: "Reschedule Booking",
    description: "Reschedule a booking. start must be UTC ISO 8601. Check get_availability first.",
    inputSchema: {
      type: "object",
      properties: { uid: { type: "string" }, start: { type: "string" }, rescheduledBy: { type: "string" } },
      required: ["uid", "start"],
    },
    annotations: UP,
  },
  {
    name: "cancel_booking",
    title: "Cancel Booking",
    description: "Cancel a booking by UID.",
    inputSchema: {
      type: "object",
      properties: { uid: { type: "string" }, cancellationReason: { type: "string" } },
      required: ["uid"],
    },
    annotations: DE,
  },
  {
    name: "confirm_booking",
    title: "Confirm Booking",
    description: "Confirm a pending booking. Host only.",
    inputSchema: { type: "object", properties: { uid: { type: "string" } }, required: ["uid"] },
    annotations: UP,
  },
  {
    name: "mark_booking_absent",
    title: "Mark Booking Absent",
    description: "Mark host or an attendee as no-show on a past booking.",
    inputSchema: {
      type: "object",
      properties: { uid: { type: "string" }, host: { type: "boolean" }, attendeeEmail: { type: "string" } },
      required: ["uid"],
    },
    annotations: UP,
  },
  {
    name: "get_booking_attendees",
    title: "List Booking Attendees",
    description: "Get attendees for a booking UID.",
    inputSchema: { type: "object", properties: { uid: { type: "string" } }, required: ["uid"] },
    annotations: RO,
  },
  {
    name: "add_booking_attendee",
    title: "Add Booking Attendee",
    description: "Add an attendee. Required: name, email, timeZone.",
    inputSchema: {
      type: "object",
      properties: {
        uid: { type: "string" },
        name: { type: "string" },
        email: { type: "string" },
        timeZone: { type: "string" },
      },
      required: ["uid", "name", "email", "timeZone"],
    },
    annotations: CR,
  },
  {
    name: "get_booking_attendee",
    title: "Get Booking Attendee",
    description: "Get one attendee by numeric ID within a booking.",
    inputSchema: {
      type: "object",
      properties: { uid: { type: "string" }, attendeeId: { type: "number" } },
      required: ["uid", "attendeeId"],
    },
    annotations: RO,
  },
  {
    name: "get_schedules",
    title: "List Schedules",
    description: "List schedules for the authenticated user.",
    inputSchema: empty,
    annotations: RO,
  },
  {
    name: "get_schedule",
    title: "Get Schedule",
    description: "Get a schedule by ID including availability slots.",
    inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
    annotations: RO,
  },
  {
    name: "create_schedule",
    title: "Create Schedule",
    description: "Create a schedule. Required: name, timeZone.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        timeZone: { type: "string" },
        isDefault: { type: "boolean" },
      },
      required: ["name", "timeZone"],
    },
    annotations: CR,
  },
  {
    name: "update_schedule",
    title: "Update Schedule",
    description: "Update schedule name or timeZone.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" }, name: { type: "string" }, timeZone: { type: "string" } },
      required: ["id"],
    },
    annotations: UP,
  },
  {
    name: "delete_schedule",
    title: "Delete Schedule",
    description: "Delete a schedule by ID.",
    inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
    annotations: DE,
  },
  {
    name: "get_default_schedule",
    title: "Get Default Schedule",
    description: "Get the authenticated user's default schedule.",
    inputSchema: empty,
    annotations: RO,
  },
  {
    name: "get_availability",
    title: "Get Availability",
    description: "Get open slots. Provide eventTypeId, or eventTypeSlug + username, or eventTypeSlug + teamSlug. start/end UTC ISO 8601.",
    inputSchema: {
      type: "object",
      properties: {
        eventTypeId: { type: "number" },
        eventTypeSlug: { type: "string" },
        username: { type: "string" },
        teamSlug: { type: "string" },
        start: { type: "string" },
        end: { type: "string" },
        timeZone: { type: "string" },
      },
    },
    annotations: RO,
  },
  {
    name: "get_connected_calendars",
    title: "List Connected Calendars",
    description: "List calendar integrations and destination calendar.",
    inputSchema: empty,
    annotations: RO,
  },
  {
    name: "get_busy_times",
    title: "Get Busy Times",
    description: "Busy blocks from bookings between dateFrom and dateTo (YYYY-MM-DD).",
    inputSchema: {
      type: "object",
      properties: { dateFrom: { type: "string" }, dateTo: { type: "string" } },
      required: ["dateFrom", "dateTo"],
    },
    annotations: RO,
  },
  {
    name: "get_conferencing_apps",
    title: "List Conferencing Apps",
    description: "List connected conferencing credentials (Zoom, Google Meet, Cal Video).",
    inputSchema: empty,
    annotations: RO,
  },
  {
    name: "get_booking_routing_trace",
    title: "Get Booking Routing Trace",
    description: "Routing form assignment stored for a booking UID, if any.",
    inputSchema: { type: "object", properties: { uid: { type: "string" } }, required: ["uid"] },
    annotations: RO,
  },
  {
    name: "calculate_routing_form_slots",
    title: "Calculate Routing Form Slots",
    description: "Submit routing form answers and get the assigned host or team plus a redirect URL.",
    inputSchema: {
      type: "object",
      properties: {
        routingFormId: { type: "number" },
        answers: { type: "object", additionalProperties: { type: "string" } },
      },
      required: ["routingFormId", "answers"],
    },
    annotations: CR,
  },
  {
    name: "get_my_teams",
    title: "Get My Teams",
    description: "Teams the authenticated user belongs to.",
    inputSchema: empty,
    annotations: RO,
  },
  {
    name: "get_org_teams",
    title: "Get Organization Teams",
    description: "Sub-teams of the user's organization.",
    inputSchema: empty,
    annotations: RO,
  },
  {
    name: "get_team_memberships",
    title: "Get Team Memberships",
    description: "Members of a team.",
    inputSchema: { type: "object", properties: { teamId: { type: "number" } }, required: ["teamId"] },
    annotations: RO,
  },
  {
    name: "get_team_membership",
    title: "Get Team Membership",
    description: "One membership by userId and teamId.",
    inputSchema: {
      type: "object",
      properties: { teamId: { type: "number" }, userId: { type: "number" } },
      required: ["teamId", "userId"],
    },
    annotations: RO,
  },
  {
    name: "create_team_invite",
    title: "Create Team Invite",
    description: "Invite an existing user by email.",
    inputSchema: {
      type: "object",
      properties: { teamId: { type: "number" }, email: { type: "string" }, role: { type: "string" } },
      required: ["teamId", "email"],
    },
    annotations: CR,
  },
  {
    name: "create_team_membership",
    title: "Create Team Membership",
    description: "Add a user to a team by userId.",
    inputSchema: {
      type: "object",
      properties: { teamId: { type: "number" }, userId: { type: "number" }, role: { type: "string" } },
      required: ["teamId", "userId"],
    },
    annotations: CR,
  },
  {
    name: "update_team_membership",
    title: "Update Team Membership",
    description: "Change a member role or accepted flag.",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "number" },
        userId: { type: "number" },
        role: { type: "string" },
        accepted: { type: "boolean" },
      },
      required: ["teamId", "userId"],
    },
    annotations: UP,
  },
  {
    name: "delete_team_membership",
    title: "Delete Team Membership",
    description: "Remove a user from a team.",
    inputSchema: {
      type: "object",
      properties: { teamId: { type: "number" }, userId: { type: "number" } },
      required: ["teamId", "userId"],
    },
    annotations: DE,
  },
  {
    name: "get_org_memberships",
    title: "Get Organization Memberships",
    description: "Members of the user's organization.",
    inputSchema: empty,
    annotations: RO,
  },
  {
    name: "create_org_membership",
    title: "Create Organization Membership",
    description: "Add a user to the organization by email.",
    inputSchema: { type: "object", properties: { email: { type: "string" }, role: { type: "string" } }, required: ["email"] },
    annotations: CR,
  },
  {
    name: "get_org_membership",
    title: "Get Organization Membership",
    description: "One org membership by userId.",
    inputSchema: { type: "object", properties: { userId: { type: "number" } }, required: ["userId"] },
    annotations: RO,
  },
  {
    name: "update_org_membership",
    title: "Update Organization Membership",
    description: "Update org member role.",
    inputSchema: {
      type: "object",
      properties: { userId: { type: "number" }, role: { type: "string" } },
      required: ["userId"],
    },
    annotations: UP,
  },
  {
    name: "delete_org_membership",
    title: "Delete Organization Membership",
    description: "Remove a user from the organization.",
    inputSchema: { type: "object", properties: { userId: { type: "number" } }, required: ["userId"] },
    annotations: DE,
  },
  {
    name: "get_org_attributes",
    title: "List Org Attributes",
    description: "Organization attributes used for segments and routing.",
    inputSchema: empty,
    annotations: RO,
  },
  {
    name: "get_org_attribute",
    title: "Get Org Attribute",
    description: "One attribute by ID.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    annotations: RO,
  },
  {
    name: "get_attribute_options",
    title: "List Attribute Options",
    description: "Options for a SINGLE_SELECT or MULTI_SELECT attribute.",
    inputSchema: { type: "object", properties: { attributeId: { type: "string" } }, required: ["attributeId"] },
    annotations: RO,
  },
  {
    name: "get_user_attributes",
    title: "Get User Attributes",
    description: "Attribute options assigned to a user in the organization.",
    inputSchema: { type: "object", properties: { userId: { type: "number" } }, required: ["userId"] },
    annotations: RO,
  },
  {
    name: "assign_attribute_to_user",
    title: "Assign Attribute to User",
    description: "Assign an attribute option (or TEXT value) to a user.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "number" },
        attributeId: { type: "string" },
        attributeOptionId: { type: "string" },
        value: { type: "string" },
      },
      required: ["userId", "attributeId"],
    },
    annotations: CR,
  },
  {
    name: "update_user_attribute",
    title: "Update User Attribute",
    description: "Change weight on an assignment.",
    inputSchema: {
      type: "object",
      properties: { userId: { type: "number" }, attributeOptionId: { type: "string" }, weight: { type: "number" } },
      required: ["userId", "attributeOptionId"],
    },
    annotations: UP,
  },
  {
    name: "unassign_attribute_from_user",
    title: "Unassign Attribute from User",
    description: "Remove an attribute option from a user.",
    inputSchema: {
      type: "object",
      properties: { userId: { type: "number" }, attributeOptionId: { type: "string" } },
      required: ["userId", "attributeOptionId"],
    },
    annotations: DE,
  },
  {
    name: "get_org_routing_forms",
    title: "Get Organization Routing Forms",
    description: "List routing forms for the user or org teams.",
    inputSchema: empty,
    annotations: RO,
  },
  {
    name: "get_org_routing_form_responses",
    title: "Get Routing Form Responses",
    description: "Responses for a routing form.",
    inputSchema: { type: "object", properties: { formId: { type: "number" } }, required: ["formId"] },
    annotations: RO,
  },
  {
    name: "get_app_link",
    title: "Get App Link",
    description: "Build a URL that opens a booking, event type, team, routing form, or settings page.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["booking", "eventType", "team", "routingForm", "settings"] },
        uid: { type: "string" },
        eventTypeId: { type: "number" },
        teamSlug: { type: "string" },
        formId: { type: "number" },
        path: { type: "string" },
      },
      required: ["kind"],
    },
    annotations: RO,
  },
];
