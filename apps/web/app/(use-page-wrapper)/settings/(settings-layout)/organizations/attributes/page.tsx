import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { AttributesView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="Attributes" description="Organization attributes and segments">
    <AttributesView />
  </SettingsHeader>
);

export default Page;
