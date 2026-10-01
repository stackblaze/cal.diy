import { EventRepository } from "@calcom/features/eventtypes/repositories/EventRepository";
import type { PageProps as LegacyPageProps } from "~/users/views/users-type-public-view";
import LegacyPage from "~/users/views/users-type-public-view";
import { notFound } from "next/navigation";

export default async function TeamEventPage({
  params,
}: {
  params: Promise<{ slug: string; type: string }>;
}) {
  const { slug, type } = await params;
  const eventData = await EventRepository.getPublicEvent({
    username: slug,
    eventSlug: type,
    isTeamEvent: true,
    org: null,
    fromRedirectOfNonOrgLink: false,
  });
  if (!eventData) notFound();
  const props: LegacyPageProps = {
    eventData,
    booking: undefined,
    rescheduleUid: null,
    bookingUid: null,
    user: slug,
    slug: type,
    isBrandingHidden: false,
    isSEOIndexable: true,
    themeBasis: slug,
    orgBannerUrl: null,
  };
  return <LegacyPage {...(props as LegacyPageProps)} />;
}
