import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { RoutingFormsView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="Routing forms" description="Route bookers to the right host">
    <RoutingFormsView />
  </SettingsHeader>
);

export default Page;
