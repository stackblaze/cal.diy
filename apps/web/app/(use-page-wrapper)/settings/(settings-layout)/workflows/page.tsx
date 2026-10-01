import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { WorkflowsView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="Workflows" description="Email automations on booking events">
    <WorkflowsView />
  </SettingsHeader>
);

export default Page;
