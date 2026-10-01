import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { SsoSettingsView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="SSO" description="SAML and SCIM">
    <SsoSettingsView />
  </SettingsHeader>
);

export default Page;
