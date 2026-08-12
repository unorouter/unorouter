import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import {
  DocKbd,
  DocSection,
  DocTable,
} from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.BACKUPS";

export async function BackupsContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="why" title={k("H_WHY")}>
        <p>{k("P_WHY_1")}</p>
        <p>{k("P_WHY_2")}</p>
      </DocSection>

      <DocSection id="backup" title={k("H_BACKUP")}>
        <p>{k("P_BACKUP_1")}</p>
        <ol className="text-muted-foreground list-decimal space-y-2 pl-5">
          <li>{k("S_BACKUP_1")}</li>
          <li>{k("S_BACKUP_2")}</li>
          <li>{k("S_BACKUP_3")}</li>
          <li>{k("S_BACKUP_4")}</li>
        </ol>
        <p>{k("P_BACKUP_2")}</p>
        <DocTable
          headers={[k("TH_OPTION"), k("TH_DEFAULT"), k("TH_MEANS")]}
          rows={[
            [
              <DocKbd key="c">{k("X_OPT_CHATS")}</DocKbd>,
              k("X_ON"),
              k("X_OPT_CHATS_DESC"),
            ],
            [
              <DocKbd key="m">{k("X_OPT_MEDIA")}</DocKbd>,
              k("X_ON"),
              k("X_OPT_MEDIA_DESC"),
            ],
            [
              <DocKbd key="l">{k("X_OPT_LOGS")}</DocKbd>,
              k("X_OFF"),
              k("X_OPT_LOGS_DESC"),
            ],
          ]}
        />
        <p>{k("P_BACKUP_3")}</p>
      </DocSection>

      <DocSection id="restore" title={k("H_RESTORE")}>
        <p>{k("P_RESTORE_1")}</p>
        <ol className="text-muted-foreground list-decimal space-y-2 pl-5">
          <li>{k("S_RESTORE_1")}</li>
          <li>{k("S_RESTORE_2")}</li>
          <li>{k("S_RESTORE_3")}</li>
          <li>{k("S_RESTORE_4")}</li>
        </ol>
        <p>{k("P_RESTORE_2")}</p>
        <p>{k("P_RESTORE_3")}</p>
      </DocSection>

      <DocSection id="size" title={k("H_SIZE")}>
        <p>{k("P_SIZE_1")}</p>
        <p>{k("P_SIZE_2")}</p>
        <p>{k("P_SIZE_3")}</p>
      </DocSection>

      <DocSection id="move" title={k("H_MOVE")}>
        <p>{k("P_MOVE_1")}</p>
        <p>{k("P_MOVE_2")}</p>
        <p>{k("P_MOVE_3")}</p>
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
