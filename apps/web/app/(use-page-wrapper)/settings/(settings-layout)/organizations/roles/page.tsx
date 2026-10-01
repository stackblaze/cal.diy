import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { RolesView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="Roles" description="Organization roles and permissions">
    <RolesView />
  </SettingsHeader>
);

export default Page;
