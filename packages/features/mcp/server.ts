import { authenticateMcpRequest } from "./auth";
import { MCP_TOOLS } from "./catalog";
import { runMcpTool } from "./handlers";

type JsonRpc = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const PROTOCOL = "2024-11-05";

function ok(id: JsonRpc["id"], result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function fail(id: JsonRpc["id"], message: string, code = -32000) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handleOne(message: JsonRpc, req: Request) {
  const method = message.method || "";
  if (method === "initialize") {
    return ok(message.id, {
      protocolVersion: PROTOCOL,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "cal.diy", version: "1.0.0", title: "Cal.diy MCP" },
      instructions:
        "Cal.diy companion-compatible MCP. Use get_me first. For bookings, call get_availability before create_booking or reschedule_booking. Auth is the API key on this request.",
    });
  }
  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return null;
  }
  if (method === "ping") {
    return ok(message.id, {});
  }
  if (method === "tools/list") {
    const toolsets = new URL(req.url).searchParams.get("toolsets");
    const tools = filterTools(MCP_TOOLS, toolsets).map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    }));
    return ok(message.id, { tools });
  }
  if (method === "tools/call") {
    const user = await authenticateMcpRequest(req);
    if (!user) return fail(message.id, "Unauthorized: send Authorization: Bearer <api key>", -32001);
    const params = message.params || {};
    const name = String(params.name || "");
    const args = (params.arguments || {}) as Record<string, unknown>;
    try {
      const result = await runMcpTool(name, args, user);
      return ok(message.id, result);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Tool failed";
      return ok(message.id, { content: [{ type: "text", text }], isError: true });
    }
  }
  if (!method) return fail(message.id, "Missing method", -32600);
  return fail(message.id, `Method not found: ${method}`, -32601);
}

export async function handleMcpHttp(req: Request) {
  if (req.method === "GET") {
    return new Response(null, { status: 405, headers: cors(req) });
  }
  if (req.method === "DELETE") {
    return new Response(null, { status: 204, headers: cors(req) });
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(req) });
  }
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: cors(req) });
  }
  const messages = Array.isArray(body) ? body : [body];
  const results = [];
  for (const message of messages) {
    const result = await handleOne(message as JsonRpc, req);
    if (result) results.push(result);
  }
  if (!results.length) {
    return new Response(null, { status: 202, headers: cors(req) });
  }
  const payload = Array.isArray(body) ? results : results[0];
  const headers = cors(req);
  const session = req.headers.get("mcp-session-id") || crypto.randomUUID();
  headers.set("mcp-session-id", session);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(payload), { status: 200, headers });
}

const TOOLSET_PREFIX: Record<string, string[]> = {
  profile: ["get_me", "update_me", "get_app_link"],
  "event-types": ["get_event_type", "get_event_types", "create_event_type", "update_event_type", "delete_event_type", "get_scheduling_config"],
  bookings: [
    "get_booking",
    "get_bookings",
    "create_booking",
    "reschedule_booking",
    "cancel_booking",
    "confirm_booking",
    "mark_booking_absent",
    "get_booking_attendee",
    "get_booking_attendees",
    "add_booking_attendee",
    "get_booking_routing_trace",
  ],
  schedules: ["get_schedule", "get_schedules", "create_schedule", "update_schedule", "delete_schedule", "get_default_schedule"],
  availability: ["get_availability", "get_busy_times"],
  calendars: ["get_connected_calendars", "get_conferencing_apps"],
  teams: [
    "get_my_teams",
    "get_org_teams",
    "get_team_membership",
    "get_team_memberships",
    "create_team_invite",
    "create_team_membership",
    "update_team_membership",
    "delete_team_membership",
  ],
  organizations: [
    "get_org_membership",
    "get_org_memberships",
    "create_org_membership",
    "update_org_membership",
    "delete_org_membership",
    "get_org_attribute",
    "get_org_attributes",
    "get_attribute_options",
    "get_user_attributes",
    "assign_attribute_to_user",
    "update_user_attribute",
    "unassign_attribute_from_user",
  ],
  "routing-forms": ["calculate_routing_form_slots", "get_org_routing_forms", "get_org_routing_form_responses"],
};

function filterTools(tools: typeof MCP_TOOLS, toolsets: string | null) {
  if (!toolsets) return tools;
  const allowed = new Set(
    toolsets
      .split(",")
      .map((part) => part.trim())
      .flatMap((name) => TOOLSET_PREFIX[name] || [])
  );
  allowed.add("get_app_link");
  return tools.filter((tool) => allowed.has(tool.name));
}

function cors(req: Request) {
  const headers = new Headers();
  headers.set("access-control-allow-origin", req.headers.get("origin") || "*");
  headers.set("access-control-allow-headers", "Authorization, Content-Type, mcp-session-id, MCP-Protocol-Version");
  headers.set("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
  headers.set("access-control-expose-headers", "mcp-session-id");
  return headers;
}
