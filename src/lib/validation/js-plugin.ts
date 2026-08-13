import { Type as t, type Static } from "@sinclair/typebox/type";
import { MAX_NAME_LEN } from "./rp";

export const JS_PLUGIN_KINDS = ["uno", "janitor"] as const;
export const jsPluginKind = t.Union(JS_PLUGIN_KINDS.map((k) => t.Literal(k)));
export type JsPluginKind = Static<typeof jsPluginKind>;

// Generous but bounded: the largest published Janitor scripts are ~10k chars,
// Risu plugins run bigger; a runaway paste should still fail validation.
export const MAX_SCRIPT_LEN = 500_000;

export const jsPluginBody = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN }),
  script: t.String({ minLength: 1, maxLength: MAX_SCRIPT_LEN }),
  kind: jsPluginKind,
  enabled: t.Boolean(),
});
export type JsPluginBody = Static<typeof jsPluginBody>;

export const jsPluginForm = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LEN, default: "" }),
  script: t.String({
    minLength: 1,
    maxLength: MAX_SCRIPT_LEN,
    default: "",
  }),
  kind: t.Union(
    JS_PLUGIN_KINDS.map((k) => t.Literal(k)),
    { default: "uno" },
  ),
  enabled: t.Boolean({ default: true }),
});
export type JsPluginForm = Static<typeof jsPluginForm>;
