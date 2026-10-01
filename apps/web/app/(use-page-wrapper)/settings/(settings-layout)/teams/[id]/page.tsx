import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import TeamDetailView from "~/settings/teams/team-detail-view";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return (
    <SettingsHeader title="Team" description="Members and event types">
      <TeamDetailView teamId={Number(id)} />
    </SettingsHeader>
  );
};

export default Page;
