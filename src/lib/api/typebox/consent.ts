import { t } from "elysia";

export const ownPurposeObjectionBody = t.Object({
  objection: t.Boolean(),
});

// Either aliases or a model, whose missing providers the gateway grants.
export const providerConsentGrantBody = t.Object({
  aliases: t.Array(t.String({ maxLength: 16 }), { maxItems: 500 }),
  model: t.String({ maxLength: 255 }),
  locale: t.String({ maxLength: 16 }),
  text: t.String({ minLength: 1, maxLength: 20000 }),
});

export const providerConsentRevokeBody = t.Object({
  alias: t.String({ minLength: 1, maxLength: 16 }),
});

export const providerConsentListQuery = t.Object({
  model: t.Optional(t.String({ maxLength: 255 })),
});
