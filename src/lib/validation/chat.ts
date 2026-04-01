import { t } from "elysia";

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
  file: t.File({
    type: [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
    maxSize: "20m",
  }),
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
