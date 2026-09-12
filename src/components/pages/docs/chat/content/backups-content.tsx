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

function Steps(props: { items: string[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5">
      {props.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}

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
          priority
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

      <DocSection id="transfer" title={k("H_TRANSFER")}>
        <p>{k("P_TRANSFER_1")}</p>
        <Steps
          items={[
            k("S_TRANSFER_1"),
            k("S_TRANSFER_2"),
            k("S_TRANSFER_3"),
            k("S_TRANSFER_4"),
          ]}
        />
        <p>{k("P_TRANSFER_2")}</p>
        <DocWarning>{k("P_TRANSFER_SAFETY")}</DocWarning>
        <DocTable
          headers={[k("TH_DETAIL"), k("TH_VALUE")]}
          rows={[
            [k("D_LIMIT"), k("D_LIMIT_V")],
            [k("D_LIFETIME"), k("D_LIFETIME_V")],
            [k("D_HOSTS"), k("D_HOSTS_V")],
            [k("D_SERVER"), k("D_SERVER_V")],
          ]}
        />
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
            [k("X_SYM_CODE"), k("X_FIX_CODE")],
            [k("X_SYM_BIG"), k("X_FIX_BIG")],
          ]}
        />
      </DocSection>
    </>
  );
}
