import { Type as t } from "@sinclair/typebox/type";
import { TOKENIZER_PRESETS } from "@/lib/ai/chat/tokenizer";

// Its own module because both rp.ts (presets) and custom-provider.ts carry this ref;
// having either import it from the other makes those two files circular.
export const tokenizerRef = t.Union([
  ...TOKENIZER_PRESETS.map((tk) => t.Literal(tk)),
  t.TemplateLiteral([t.Literal("hf:"), t.String()]),
]);
