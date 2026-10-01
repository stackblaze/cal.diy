"use client";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

export function WorkflowsView() {
  const utils = trpc.useUtils();
  const { data } = trpc.viewer.workflows.list.useQuery();
  const create = trpc.viewer.workflows.create.useMutation({
    onSuccess: () => {
      showToast("Workflow created", "success");
      void utils.viewer.workflows.list.invalidate();
    },
  });
  const remove = trpc.viewer.workflows.delete.useMutation({
    onSuccess: () => void utils.viewer.workflows.list.invalidate(),
  });
  const [name, setName] = useState("");
  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({
            name,
            trigger: "BOOKING_CREATED",
            steps: [{ action: "EMAIL_ATTENDEE", template: "Your booking {{title}} is confirmed." }],
          });
          setName("");
        }}>
        <input
          className="border-subtle bg-default w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Workflow name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit">Create</Button>
      </form>
      <ul className="space-y-2 text-sm">
        {data?.map((row) => (
          <li key={row.id} className="flex justify-between">
            <span>
              {row.name} · {row.trigger}
            </span>
            <Button variant="ghost" size="sm" onClick={() => remove.mutate({ id: row.id })}>
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RoutingFormsView() {
  const utils = trpc.useUtils();
  const { data } = trpc.viewer.routingForms.list.useQuery();
  const create = trpc.viewer.routingForms.create.useMutation({
    onSuccess: () => void utils.viewer.routingForms.list.invalidate(),
  });
  const remove = trpc.viewer.routingForms.delete.useMutation({
    onSuccess: () => void utils.viewer.routingForms.list.invalidate(),
  });
  const [name, setName] = useState("");
  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({
            name,
            fields: [{ name: "region", type: "text" }],
            routes: [],
          });
          setName("");
        }}>
        <input
          className="border-subtle bg-default w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Routing form name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit">Create</Button>
      </form>
      <ul className="space-y-2 text-sm">
        {data?.map((row) => (
          <li key={row.id} className="flex justify-between">
            <span>
              {row.name} · {row._count.responses} responses · /r/{row.id}
            </span>
            <Button variant="ghost" size="sm" onClick={() => remove.mutate({ id: row.id })}>
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InsightsView() {
  const { data } = trpc.viewer.insights.bookings.useQuery();
  const { data: audit } = trpc.viewer.insights.audit.useQuery({ take: 20 });
  return (
    <div className="space-y-6">
      <div>
        <p className="text-2xl font-semibold">{data?.total ?? 0}</p>
        <p className="text-subtle text-sm">Total bookings</p>
        <ul className="mt-2 text-sm">
          {data?.byStatus.map((row) => (
            <li key={row.status}>
              {row.status}: {row.count}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium">Recent booking audit</h3>
        <ul className="text-subtle space-y-1 text-xs">
          {audit?.map((row) => (
            <li key={row.id}>
              {row.action} · {row.bookingUid} · {new Date(row.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function OrgProfileView() {
  const { data: org } = trpc.viewer.organizations.mine.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.viewer.organizations.create.useMutation({
    onSuccess: () => void utils.viewer.organizations.mine.invalidate(),
  });
  const createSub = trpc.viewer.organizations.createSubTeam.useMutation({
    onSuccess: () => void utils.viewer.organizations.mine.invalidate(),
  });
  const [name, setName] = useState("");
  const [subName, setSubName] = useState("");
  if (!org) {
    return (
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ name });
        }}>
        <input
          className="border-subtle bg-default w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Organization name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit">Create organization</Button>
      </form>
    );
  }
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">{org.name}</p>
      <p className="text-subtle">/{org.slug}</p>
      <p>{org.children.length} sub-teams</p>
      <ul className="text-subtle">
        {org.children.map((child) => (
          <li key={child.id}>{child.name}</li>
        ))}
      </ul>
      <form
        className="flex gap-2 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          createSub.mutate({ organizationId: org.id, name: subName });
          setSubName("");
        }}>
        <input
          className="border-subtle bg-default w-full rounded-md border px-3 py-2 text-sm"
          placeholder="New sub-team"
          value={subName}
          onChange={(e) => setSubName(e.target.value)}
        />
        <Button type="submit" size="sm">
          Add team
        </Button>
      </form>
    </div>
  );
}

export function SsoSettingsView() {
  return (
    <div className="space-y-2 text-sm">
      <p>Set SAML_ENTRY_POINT, SAML_ISSUER, and SAML_CERT on the instance to enable SAML login.</p>
      <p>SCIM uses Authorization: Bearer SCIM_TOKEN against /api/scim/v2/Users and /api/scim/v2/Groups.</p>
    </div>
  );
}

export function RolesView() {
  const { data: org } = trpc.viewer.organizations.mine.useQuery();
  const utils = trpc.useUtils();
  const { data: roles } = trpc.viewer.organizations.listRoles.useQuery(
    { organizationId: org?.id ?? 0 },
    { enabled: !!org?.id }
  );
  const create = trpc.viewer.organizations.createRole.useMutation({
    onSuccess: () => {
      showToast("Role created", "success");
      if (org?.id) void utils.viewer.organizations.listRoles.invalidate({ organizationId: org.id });
    },
  });
  const [name, setName] = useState("");
  if (!org) return <p className="text-sm">Create an organization first.</p>;
  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({
            organizationId: org.id,
            name,
            permissions: [{ resource: "eventType", action: "create" }],
          });
          setName("");
        }}>
        <input
          className="border-subtle bg-default w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Role name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit">Create</Button>
      </form>
      <ul className="space-y-1 text-sm">
        {roles?.map((role) => (
          <li key={role.id}>
            {role.name} · {role.permissions.map((p) => `${p.resource}:${p.action}`).join(", ") || "no permissions"}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AttributesView() {
  const { data: org } = trpc.viewer.organizations.mine.useQuery();
  const utils = trpc.useUtils();
  const { data: attributes } = trpc.viewer.organizations.attributes.useQuery(
    { organizationId: org?.id ?? 0 },
    { enabled: !!org?.id }
  );
  const create = trpc.viewer.organizations.createAttribute.useMutation({
    onSuccess: () => org && void utils.viewer.organizations.attributes.invalidate({ organizationId: org.id }),
  });
  const [name, setName] = useState("");
  if (!org) return <p className="text-sm">Create an organization first.</p>;
  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ organizationId: org.id, name });
          setName("");
        }}>
        <input
          className="border-subtle bg-default w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Attribute / segment name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit">Create</Button>
      </form>
      <ul className="space-y-1 text-sm">
        {attributes?.map((attr) => (
          <li key={attr.id}>
            {attr.name} · {attr.type} · {attr.options.length} options
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DsyncView() {
  const { data: org } = trpc.viewer.organizations.mine.useQuery();
  const utils = trpc.useUtils();
  const { data } = trpc.viewer.organizations.dsync.useQuery(
    { organizationId: org?.id ?? 0 },
    { enabled: !!org?.id }
  );
  const enable = trpc.viewer.organizations.enableDsync.useMutation({
    onSuccess: () => org && void utils.viewer.organizations.dsync.invalidate({ organizationId: org.id }),
  });
  if (!org) return <p className="text-sm">Create an organization first.</p>;
  return (
    <div className="space-y-3 text-sm">
      <p>Directory ID: {data?.directoryId || "not configured"}</p>
      <p>Tenant: {data?.tenant || "—"}</p>
      <p>{data?.teamGroupMapping.length ?? 0} group mappings</p>
      <Button size="sm" onClick={() => enable.mutate({ organizationId: org.id })}>
        Enable SCIM directory
      </Button>
    </div>
  );
}

export function DelegationView() {
  const { data: org } = trpc.viewer.organizations.mine.useQuery();
  const { data } = trpc.viewer.organizations.delegationCredentials.useQuery(
    { organizationId: org?.id ?? 0 },
    { enabled: !!org?.id }
  );
  if (!org) return <p className="text-sm">Create an organization first.</p>;
  return (
    <ul className="space-y-1 text-sm">
      {data?.length
        ? data.map((row) => (
            <li key={row.id}>
              {row.domain} · {row.enabled ? "enabled" : "disabled"}
            </li>
          ))
        : "No domain-wide calendar credentials yet. Add DelegationCredential records for workspace-wide access."}
    </ul>
  );
}
