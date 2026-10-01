import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata } from "app/_utils";
import TeamsView from "~/settings/teams/teams-view";

export const generateMetadata = async () =>
  await _generateMetadata((t) => t("teams") || "Teams", () => "Create and manage teams", undefined, undefined, "/settings/teams");

const Page = () => (
  <SettingsHeader title="Teams" description="Shared availability and team booking pages">
    <TeamsView />
  </SettingsHeader>
);

export default Page;
