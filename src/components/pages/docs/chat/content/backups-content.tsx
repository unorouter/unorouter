import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import {
  DocImage,
  DocSection,
  DocTable,
  DocWarning,
} from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.BACKUPS";

export async function BackupsContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="backup" title={k("H_BACKUP")}>
        <DocWarning>{k("P_WHY")}</DocWarning>
        <p>{k("P_BACKUP_1")}</p>
        <DocImage
          src="/images/docs/backups-tools-menu.webp"
          alt={k("IMG_TOOLS_ALT")}
          width={259}
          height={261}
          natural
        />
        <p>{k("P_BACKUP_2")}</p>
      </DocSection>

      <DocSection id="restore" title={k("H_RESTORE")}>
        <DocImage
          src="/images/docs/backups-database-menu.webp"
          alt={k("IMG_DATABASE_ALT")}
          width={360}
          height={273}
          natural
        />
        <p>{k("P_RESTORE_1")}</p>
        <p>{k("P_RESTORE_2")}</p>
      </DocSection>

      <DocSection id="size" title={k("H_SIZE")}>
        <p>{k("P_SIZE_1")}</p>
        <p>{k("P_SIZE_2")}</p>
      </DocSection>

      <DocSection id="troubleshoot" title={k("H_TROUBLESHOOT")}>
        <DocTable
          headers={[k("TH_SYMPTOM"), k("TH_FIX")]}
          rows={[
            [k("X_SYM_CRASH"), k("X_FIX_CRASH")],
            [k("X_SYM_EMPTY"), k("X_FIX_EMPTY")],
            [k("X_SYM_SKIPPED"), k("X_FIX_SKIPPED")],
            [k("X_SYM_IOS"), k("X_FIX_IOS")],
          ]}
        />
      </DocSection>
    </>
  );
}
