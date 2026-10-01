import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { DelegationView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="Delegation credentials" description="Domain-wide calendar access">
    <DelegationView />
  </SettingsHeader>
);

export default Page;
