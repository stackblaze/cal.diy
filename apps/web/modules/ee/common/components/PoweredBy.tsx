import Link from "next/link";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { APP_NAME, IS_SELF_HOSTED, POWERED_BY_URL, WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const PoweredByCal = ({
  logoOnly,
  hasValidLicense,
}: {
  logoOnly?: boolean;
  hasValidLicense?: boolean | null;
}) => {
  const { t } = useLocale();
  const isEmbed = useIsEmbed();

  // Self-hosted embeds are white-labeled — no Cal.com footer on external sites.
  if (IS_SELF_HOSTED && isEmbed) {
    return null;
  }

  const poweredByHref = IS_SELF_HOSTED ? WEBSITE_URL : POWERED_BY_URL;
  const showCalLogo = !IS_SELF_HOSTED && (APP_NAME === "Cal.com" || !hasValidLicense);

  return (
    <div className={`p-2 text-center text-xs sm:text-right${isEmbed ? " max-w-3xl" : ""}`}>
      <Link href={poweredByHref} target="_blank" className="text-subtle">
        {!logoOnly && <>{t("powered_by")} </>}
        {showCalLogo ? (
          <img
            className="-mt-px inline h-[10px] w-auto dark:invert"
            src={`${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/logo`}
            alt={`${APP_NAME} logo`}
          />
        ) : (
          <span className="text-emphasis font-semibold opacity-50 hover:opacity-100">{APP_NAME}</span>
        )}
      </Link>
    </div>
  );
};

export default PoweredByCal;
