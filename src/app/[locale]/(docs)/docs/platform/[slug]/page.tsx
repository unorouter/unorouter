import { AccountAndBillingContent } from "@/components/pages/docs/platform/content/account-and-billing-content";
import { ConsentsContent } from "@/components/pages/docs/platform/content/consents-content";
import { DiscordRewardsContent } from "@/components/pages/docs/platform/content/discord-rewards-content";
import { ErrorsAndRateLimitsContent } from "@/components/pages/docs/platform/content/errors-and-rate-limits-content";
import { GroupPinningContent } from "@/components/pages/docs/platform/content/group-pinning-content";
import { ModelsAndPricingContent } from "@/components/pages/docs/platform/content/models-and-pricing-content";
import { NotificationsContent } from "@/components/pages/docs/platform/content/notifications-content";
import { PlatformApiContent } from "@/components/pages/docs/platform/content/platform-api-content";
import { QuickstartContent } from "@/components/pages/docs/platform/content/quickstart-content";
import { PLATFORM_DOCS } from "@/components/pages/docs/platform/platform-docs";
import { docSlugRoute } from "@/components/pages/docs/doc-template";

const route = docSlugRoute({
  docs: PLATFORM_DOCS,
  namespace: "DOCS_PLATFORM",
  indexHref: "/docs/platform",
  content: {
    quickstart: QuickstartContent,
    "models-and-pricing": ModelsAndPricingContent,
    notifications: NotificationsContent,
    "group-pinning": GroupPinningContent,
    "platform-api": PlatformApiContent,
    consents: ConsentsContent,
    "errors-and-rate-limits": ErrorsAndRateLimitsContent,
    "account-and-billing": AccountAndBillingContent,
    "discord-rewards": DiscordRewardsContent,
  },
});

export const generateMetadata = route.generateMetadata;
export default route.Page;
