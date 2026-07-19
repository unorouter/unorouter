import {
  DocImage,
  DocKbd,
  DocPageLink,
  DocSection,
  DocTable,
} from "@/components/pages/docs/doc-parts";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { platformDocKey } from "../platform-doc-template";

const P = "DOCS_PLATFORM.NOTIFICATIONS";

export async function NotificationsContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(platformDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="overview" title={k("H_OVERVIEW")}>
        <p>{k("P_OVERVIEW_1")}</p>
        <p>{k("P_OVERVIEW_2")}</p>
      </DocSection>
      <DocSection id="watching" title={k("H_WATCHING")}>
        <p>{k("P_WATCHING_1")}</p>
        <DocImage
          src="/images/docs/notify-watch-button.webp"
          alt={k("ALT_WATCH_BUTTON")}
          width={815}
          height={172}
        />
        <p>{k("P_WATCHING_2")}</p>
        <DocImage
          src="/images/docs/notify-bell-watched.webp"
          alt={k("ALT_WATCHED")}
          width={400}
          height={360}
        />
      </DocSection>
      <DocSection id="wildcards" title={k("H_WILDCARDS")}>
        <p>{k("P_WILDCARDS_1")}</p>
        <p>
          <DocKbd>glm-*</DocKbd> <DocKbd>glm-*:free</DocKbd>{" "}
          <DocKbd>*-coder:free</DocKbd>
        </p>
        <p>{k("P_WILDCARDS_2")}</p>
      </DocSection>
      <DocSection id="alerts" title={k("H_ALERTS")}>
        <p>{k("P_ALERTS_1")}</p>
        <p>{k("P_ALERTS_2")}</p>
        <DocImage
          src="/images/docs/notify-bell-inbox.webp"
          alt={k("ALT_INBOX")}
          width={400}
          height={566}
        />
      </DocSection>
      <DocSection id="push" title={k("H_PUSH")}>
        <p>{k("P_PUSH_1")}</p>
        <p>{k("P_PUSH_2")}</p>
      </DocSection>
      <DocSection id="events" title={k("H_EVENTS")}>
        <p>{k("P_EVENTS_1")}</p>
        <DocTable
          headers={[k("T_EVENT"), k("T_WHEN")]}
          rows={[
            [k("R_ONLINE"), k("R_ONLINE_WHEN")],
            [k("R_OFFLINE"), k("R_OFFLINE_WHEN")],
            [k("R_PRICE"), k("R_PRICE_WHEN")],
            [k("R_ADDED"), k("R_ADDED_WHEN")],
            [k("R_REMOVED"), k("R_REMOVED_WHEN")],
          ]}
        />
        <p>
          {k("P_SEE_PINNING")}{" "}
          <DocPageLink slug="group-pinning">
            {t("DOCS_PLATFORM.GROUP_PINNING.TITLE")}
          </DocPageLink>
        </p>
      </DocSection>
    </>
  );
}
