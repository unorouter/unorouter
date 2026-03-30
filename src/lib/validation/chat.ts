import { t } from "elysia";

export const listConversationsQuery = t.Object({
  p: t.Optional(t.Numeric({ minimum: 1 })),
  page_size: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
});

export const createConversationBody = t.Object({
  model: t.String(),
  title: t.Optional(t.String()),
});

export const updateConversationBody = t.Object({
  title: t.String(),
});

export const persistMessagesBody = t.Object({
  messages: t.Array(
    t.Object({
      id: t.Optional(t.String()),
      role: t.String(),
      parts: t.Any(),
    }),
  ),
});

export const streamBody = t.Object({
  model: t.String(),
  messages: t.Any(),
});

export const mediaUploadBody = t.Object({
  file: t.File(),
  convId: t.String(),
  msgId: t.String(),
});

export const imageGenerationBody = t.Object({
  prompt: t.String(),
  model: t.String(),
  convId: t.String(),
  msgId: t.String(),
});

export const videoGenerationBody = t.Object({
  prompt: t.String(),
  model: t.String(),
  convId: t.String(),
  msgId: t.String(),
  image: t.Optional(t.String()),
});
