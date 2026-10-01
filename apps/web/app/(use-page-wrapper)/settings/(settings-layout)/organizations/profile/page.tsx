import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { OrgProfileView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="Organization" description="Org profile and sub-teams">
    <OrgProfileView />
  </SettingsHeader>
);

export default Page;
