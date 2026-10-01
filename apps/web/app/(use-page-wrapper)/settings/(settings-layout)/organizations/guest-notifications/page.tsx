import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { OrgProfileView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="Guest notifications" description="Email settings for guests">
    <OrgProfileView />
  </SettingsHeader>
);

export default Page;
