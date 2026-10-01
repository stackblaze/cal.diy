import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { DsyncView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="Directory sync" description="SCIM provisioning">
    <DsyncView />
  </SettingsHeader>
);

export default Page;
