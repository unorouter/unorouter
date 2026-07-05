import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import { chatDocKey } from "../chat-doc-template";
import { DocCode, DocKbd, DocSection } from "@/components/pages/docs/doc-parts";

const P = "DOCS_CHAT.CUSTOM_PROVIDERS";

export async function CustomProvidersContent() {
  const t = await getTranslations();
  const k = (leaf: string) => t(chatDocKey(P, leaf), APP_VALUES);

  return (
    <>
      <DocSection id="add" title={k("H_ADD")}>
        <p>{k("P_ADD_1")}</p>
        <p>{k("P_ADD_2")}</p>
      </DocSection>
      <DocSection id="models" title={k("H_MODELS")}>
        <p>{k("P_MODELS_1")}</p>
        <p>{k("P_MODELS_2")}</p>
      </DocSection>
      <DocSection id="tokenizers" title={k("H_TOKENIZERS")}>
        <p>{k("P_TOKENIZERS_1")}</p>
        <p>
          <DocKbd>auto</DocKbd> <DocKbd>cl100k</DocKbd> <DocKbd>o200k</DocKbd>{" "}
          <DocKbd>claude</DocKbd> <DocKbd>glm5</DocKbd> <DocKbd>glm4</DocKbd>{" "}
          <DocKbd>deepseek</DocKbd> <DocKbd>deepseek-v4</DocKbd>{" "}
          <DocKbd>llama3</DocKbd> <DocKbd>gemma</DocKbd> <DocKbd>qwen</DocKbd>{" "}
          <DocKbd>mistral</DocKbd> <DocKbd>cohere</DocKbd>
        </p>
        <p>{k("P_TOKENIZERS_2")}</p>
        <DocCode
          code={`hf:openai-community/gpt2\nhf:https://huggingface.co/Qwen/Qwen2.5-7B/resolve/main/tokenizer.json`}
        />
        <p>{k("P_TOKENIZERS_3")}</p>
      </DocSection>
      <DocSection id="group" title={k("H_GROUP")}>
        <p>{k("P_GROUP_1")}</p>
      </DocSection>
      <DocSection id="privacy" title={k("H_PRIVACY")}>
        <p>{k("P_PRIVACY_1")}</p>
      </DocSection>
    </>
  );
}
