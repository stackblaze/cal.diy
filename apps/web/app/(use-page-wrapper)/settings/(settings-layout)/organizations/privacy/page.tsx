import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { OrgProfileView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="Privacy" description="Organization privacy">
    <OrgProfileView />
  </SettingsHeader>
);

export default Page;
