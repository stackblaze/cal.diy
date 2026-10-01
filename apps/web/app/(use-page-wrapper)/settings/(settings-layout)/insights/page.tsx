import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { InsightsView } from "~/settings/ext/named-list-view";

const Page = () => (
  <SettingsHeader title="Insights" description="Booking volume and audit trail">
    <InsightsView />
  </SettingsHeader>
);

export default Page;
