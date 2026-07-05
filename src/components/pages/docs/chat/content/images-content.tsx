import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocKbd, DocSection } from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.IMAGES";

export async function ImagesContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="enable" title={k("H_ENABLE")}>
        <p>{k("P_ENABLE_1")}</p>
      </DocSection>
      <DocSection id="flow" title={k("H_FLOW")}>
        <p>{k("P_FLOW_1")}</p>
        <p>{k("P_FLOW_2")}</p>
      </DocSection>
      <DocSection id="models" title={k("H_MODELS")}>
        <p>{k("P_MODELS_1")}</p>
      </DocSection>
      <DocSection id="refs" title={k("H_REFS")}>
        <p>{k("P_REFS_1")}</p>
        <p>{k("P_REFS_2")}</p>
      </DocSection>
      <DocSection id="styles" title={k("H_STYLES")}>
        <p>{k("P_STYLES_1")}</p>
      </DocSection>
      <DocSection id="preview" title={k("H_PREVIEW")}>
        <p>{k("P_PREVIEW_1")}</p>
        <p>{k("P_PREVIEW_2")}</p>
      </DocSection>
      <DocSection id="inlays" title={k("H_INLAYS")}>
        <p>
          {k("P_INLAYS_1")} <DocKbd>{"{{inlay::<id>}}"}</DocKbd>{" "}
          {k("P_INLAYS_2")}
        </p>
      </DocSection>
    </>
  );
}
