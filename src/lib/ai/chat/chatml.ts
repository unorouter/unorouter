    // RisuAI parseChatML port: <|im_start|> blocks into role-tagged messages. null when input isn't ChatML, so callers fall back to a plain prompt.

export type ChatMLMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const STARTER = "<|im_start|>";
const SEPARATOR = "<|im_sep|>";
const ENDER = "<|im_end|>";

export function parseChatML(data: string): ChatMLMessage[] | null {
  const trimmed = data.trim();
  if (!trimmed.startsWith(STARTER)) return null;

  return trimmed
    .split(STARTER)
    .filter((f) => f !== "")
    .map((v) => {
      let role: ChatMLMessage["role"] = "user";
      if (v.startsWith(`user${SEPARATOR}`)) {
        role = "user";
        v = v.substring(4 + SEPARATOR.length);
      } else if (v.startsWith(`system${SEPARATOR}`)) {
        role = "system";
        v = v.substring(6 + SEPARATOR.length);
      } else if (v.startsWith(`assistant${SEPARATOR}`)) {
        role = "assistant";
        v = v.substring(9 + SEPARATOR.length);
      } else if (v.startsWith("user ") || v.startsWith("user\n")) {
        role = "user";
        v = v.substring(5);
      } else if (v.startsWith("system ") || v.startsWith("system\n")) {
        role = "system";
        v = v.substring(7);
      } else if (v.startsWith("assistant ") || v.startsWith("assistant\n")) {
        role = "assistant";
        v = v.substring(10);
      }
      v = v.trim();
      if (v.endsWith(ENDER)) v = v.substring(0, v.length - ENDER.length);
          // Risu strips <Thoughts> into a side channel; the V1 runLLM path only consumes content.
      v = v.replace(/<Thoughts>(.+)<\/Thoughts>/gms, "");
      return { role, content: v };
    });
}
