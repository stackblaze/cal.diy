import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { OrgProfileView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="Features" description="Organization feature flags">
    <OrgProfileView />
  </SettingsHeader>
);

export default Page;
