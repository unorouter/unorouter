import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import {
  DocKbd,
  DocSection,
  DocTable,
  DocWarning,
} from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.JANITORAI_IMPORT";

const TAMPERMONKEY_URL = "https://www.tampermonkey.net/";
const SCRIPT_URL =
  "https://greasyfork.org/en/scripts/593605-janitorai-full-export";
const SOURCE_URL = "https://github.com/unorouter/janitorai-full-export";

function ExternalLink(props: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {props.children}
    </a>
  );
}

function Steps(props: { items: string[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5">
      {props.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}

export async function JanitoraiImportContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="how" title={k("H_HOW")}>
        <p>{k("P_HOW_1")}</p>
        <p>{k("P_HOW_2")}</p>
        <p>
          {k("LINKS_LEAD")}{" "}
          <ExternalLink href={TAMPERMONKEY_URL}>Tampermonkey</ExternalLink>
          {", "}
          <ExternalLink href={SCRIPT_URL}>{k("LINK_SCRIPT")}</ExternalLink>
          {", "}
          <ExternalLink href={SOURCE_URL}>{k("LINK_SOURCE")}</ExternalLink>
        </p>
      </DocSection>

      <DocSection id="desktop" title={k("H_DESKTOP")}>
        <Steps
          items={[
            k("S_DESKTOP_1"),
            k("S_DESKTOP_2"),
            k("S_DESKTOP_3"),
            k("S_DESKTOP_4"),
          ]}
        />
      </DocSection>

      <DocSection id="android" title={k("H_ANDROID")}>
        <p>{k("P_ANDROID_1")}</p>
        <Steps
          items={[
            k("S_ANDROID_1"),
            k("S_ANDROID_2"),
            k("S_ANDROID_3"),
            k("S_ANDROID_4"),
            k("S_ANDROID_5"),
          ]}
        />
        <DocWarning>{k("W_ANDROID")}</DocWarning>
      </DocSection>

      <DocSection id="import" title={k("H_IMPORT")}>
        <p>
          {t(chatDocKey(P, "P_IMPORT_1"), {
            ...APP_VALUES,
            tools: t("CHAT.MORE.TOOLS"),
            importExport: t("CHAT.MORE.IMPORT_EXPORT"),
            importChat: t("CHAT.MORE.IMPORT"),
          })}
        </p>
        <p>{k("P_IMPORT_2")}</p>
      </DocSection>

      <DocSection id="result" title={k("H_RESULT")}>
        <DocTable
          headers={[k("TH_ITEM"), k("TH_DETAILS")]}
          rows={[
            [k("X_CHATS"), k("X_CHATS_D")],
            [k("X_CHARS"), k("X_CHARS_D")],
            [k("X_LORE"), k("X_LORE_D")],
            [<DocKbd key="f">skipped</DocKbd>, k("X_SKIPPED_D")],
          ]}
        />
      </DocSection>

      <DocSection id="limits" title={k("H_LIMITS")}>
        <p>{k("P_LIMITS_1")}</p>
        <p>{k("P_LIMITS_2")}</p>
      </DocSection>
    </>
  );
}
