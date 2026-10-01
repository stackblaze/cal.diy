import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { OrgProfileView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="New organization" description="Create an organization">
    <OrgProfileView />
  </SettingsHeader>
);

export default Page;
