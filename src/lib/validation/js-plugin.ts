import { Type as t, type Static } from "@sinclair/typebox/type";
import { MAX_NAME_LEN } from "./rp";

const JS_PLUGIN_KINDS = ["risu", "janitor", "perchance"] as const;
export type JsPluginKind = (typeof JS_PLUGIN_KINDS)[number];

// Generous but bounded: the largest published Janitor scripts are ~10k chars,
// Risu plugins run bigger; a runaway paste should still fail validation.
const MAX_SCRIPT_LEN = 500_000;

export type JsPluginBody = {
  name: string;
  script: string;
  kind: JsPluginKind;
  enabled: boolean;
};

export const jsPluginForm = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN, default: "" }),
  script: t.String({
    minLength: 1,
    maxLength: MAX_SCRIPT_LEN,
    default: "",
  }),
  kind: t.Union(
    JS_PLUGIN_KINDS.map((k) => t.Literal(k)),
    { default: "risu" },
  ),
  enabled: t.Boolean({ default: true }),
});
export type JsPluginForm = Static<typeof jsPluginForm>;
