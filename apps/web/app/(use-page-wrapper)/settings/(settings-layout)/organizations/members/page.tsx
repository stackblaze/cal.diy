import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { OrgProfileView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="Members" description="Organization members">
    <OrgProfileView />
  </SettingsHeader>
);

export default Page;
