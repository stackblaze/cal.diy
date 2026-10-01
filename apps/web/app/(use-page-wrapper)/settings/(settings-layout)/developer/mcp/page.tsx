import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { WEBAPP_URL } from "@calcom/lib/constants";

const Page = () => {
  const url = `${WEBAPP_URL || "https://your-cal-diy-host"}/api/mcp`;
  const cursor = `{
  "mcpServers": {
    "cal.diy": {
      "url": "${url}",
      "headers": {
        "Authorization": "Bearer cal_YOUR_API_KEY"
      }
    }
  }
}`;
  const scoped = `${url}?toolsets=bookings,event-types,availability,schedules`;
  return (
    <SettingsHeader title="MCP" description="Companion-compatible Model Context Protocol for Cursor, Claude, and VS Code">
      <div className="space-y-4 text-sm">
        <p>
          Create an API key under Developer → API keys, then add this server to your MCP client. Tools match
          calcom/companion: bookings, event types, schedules, availability, teams, orgs, routing forms.
        </p>
        <p className="text-subtle">
          Endpoint: <code className="bg-subtle rounded px-1">{url}</code>
        </p>
        <pre className="border-subtle overflow-x-auto rounded-md border p-3 text-xs">{cursor}</pre>
        <p className="text-subtle">
          Optional toolsets (same names as companion):{" "}
          <code className="bg-subtle rounded px-1">{scoped}</code>
        </p>
        <p>Valid toolsets: profile, event-types, bookings, availability, schedules, calendars, teams, organizations, routing-forms.</p>
      </div>
    </SettingsHeader>
  );
};

export default Page;
