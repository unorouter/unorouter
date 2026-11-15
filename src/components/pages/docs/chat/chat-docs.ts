import type { TranslationKey } from "@/lib/config/constants";
import type { DocI18nPrefix } from "@/lib/types";
import { makeDocs, type Doc } from "../doc-registry";

export type ChatDocSection =
  | "GETTING_STARTED"
  | "ENTITIES"
  | "PROMPTING"
  | "SCRIPTING"
  | "CONTEXT_MEDIA"
  | "DATA";

export type ChatDoc = Doc<ChatDocSection>;

type ChatDocName =
  Extract<DocI18nPrefix, `DOCS_CHAT.${string}`> extends `DOCS_CHAT.${infer N}`
    ? N
    : never;

export const CHAT_DOCS: ChatDoc[] = makeDocs(
  "/docs/chat/[slug]",
  (name: ChatDocName) => `DOCS_CHAT.${name}`,
  [
    {
      slug: "getting-started",
      name: "GETTING_STARTED",
      section: "GETTING_STARTED",
      iconName: "sparkles",
      headings: [
        ["overview", "H_OVERVIEW"],
        ["loadout", "H_LOADOUT"],
        ["greetings", "H_GREETINGS"],
        ["messages", "H_MESSAGES"],
        ["auto-continue", "H_AUTOCONTINUE"],
        ["background-models", "H_BACKGROUND_MODELS"],
        ["next", "H_NEXT"],
      ],
    },
    {
      slug: "theme",
      name: "THEME",
      section: "GETTING_STARTED",
      iconName: "paintbrush",
      headings: [
        ["open", "H_OPEN"],
        ["scopes", "H_SCOPES"],
        ["opacity", "H_OPACITY"],
        ["wallpaper", "H_WALLPAPER"],
        ["saved", "H_SAVED"],
        ["troubleshoot", "H_TROUBLESHOOT"],
      ],
    },
    {
      slug: "characters",
      name: "CHARACTERS",
      section: "ENTITIES",
      iconName: "drama",
      headings: [
        ["fields", "H_FIELDS"],
        ["prompt-fields", "H_PROMPT_FIELDS"],
        ["behavior", "H_BEHAVIOR"],
        ["import", "H_IMPORT"],
        ["export", "H_EXPORT"],
      ],
    },
    {
      slug: "personas",
      name: "PERSONAS",
      section: "ENTITIES",
      iconName: "users",
      headings: [
        ["fields", "H_FIELDS"],
        ["default", "H_DEFAULT"],
        ["import", "H_IMPORT"],
      ],
    },
    {
      slug: "lorebooks",
      name: "LOREBOOKS",
      section: "ENTITIES",
      iconName: "book-text",
      headings: [
        ["books", "H_BOOKS"],
        ["entries", "H_ENTRIES"],
        ["ordering", "H_ORDERING"],
        ["injection", "H_INJECTION"],
        ["decorators", "H_DECORATORS"],
        ["budget", "H_BUDGET"],
      ],
    },
    {
      slug: "cards",
      name: "CARDS",
      section: "ENTITIES",
      iconName: "layout-grid",
      headings: [
        ["concept", "H_CONCEPT"],
        ["apply", "H_APPLY"],
        ["export", "H_EXPORT"],
      ],
    },
    {
      slug: "presets",
      name: "PRESETS",
      section: "PROMPTING",
      iconName: "sliders-horizontal",
      headings: [
        ["sampling", "H_SAMPLING"],
        ["behavior", "H_BEHAVIOR"],
        ["prompts", "H_PROMPTS"],
        ["default", "H_DEFAULT"],
      ],
    },
    {
      slug: "prompt-template",
      name: "PROMPT_TEMPLATE",
      section: "PROMPTING",
      iconName: "grip-vertical",
      headings: [
        ["concept", "H_CONCEPT"],
        ["blocks", "H_BLOCKS"],
        ["order", "H_ORDER"],
        ["tips", "H_TIPS"],
      ],
    },
    {
      slug: "group-chats",
      name: "GROUP_CHATS",
      section: "PROMPTING",
      iconName: "message-square",
      headings: [
        ["setup", "H_SETUP"],
        ["rotation", "H_ROTATION"],
        ["gating", "H_GATING"],
        ["tips", "H_TIPS"],
      ],
    },
    {
      slug: "multiplayer",
      name: "MULTIPLAYER",
      section: "PROMPTING",
      iconName: "users",
      headings: [
        ["host", "H_HOST"],
        ["guest", "H_GUEST"],
        ["turns", "H_TURNS"],
        ["limits", "H_LIMITS"],
        ["troubleshooting", "H_TROUBLESHOOTING"],
      ],
    },
    {
      slug: "macros",
      name: "MACROS",
      section: "SCRIPTING",
      iconName: "code",
      headings: [
        ["syntax", "H_SYNTAX"],
        ["core", "H_CORE"],
        ["random", "H_RANDOM"],
        ["vars", "H_VARS"],
        ["blocks", "H_BLOCKS"],
        ["comments", "H_COMMENTS"],
      ],
    },
    {
      slug: "regex-scripts",
      name: "REGEX_SCRIPTS",
      section: "SCRIPTING",
      iconName: "scroll-text",
      headings: [
        ["modes", "H_MODES"],
        ["fields", "H_FIELDS"],
        ["meta", "H_META"],
        ["examples", "H_EXAMPLES"],
      ],
    },
    {
      slug: "triggers-and-lua",
      name: "TRIGGERS_AND_LUA",
      section: "SCRIPTING",
      iconName: "zap",
      headings: [
        ["triggers", "H_TRIGGERS"],
        ["effects", "H_EFFECTS"],
        ["lua", "H_LUA"],
        ["hooks", "H_HOOKS"],
        ["safety", "H_SAFETY"],
      ],
    },
    {
      slug: "plugins",
      name: "PLUGINS",
      section: "SCRIPTING",
      iconName: "code",
      headings: [
        ["overview", "H_OVERVIEW"],
        ["hooks", "H_HOOKS"],
        ["api", "H_API"],
        ["janitor", "H_JANITOR"],
        ["safety", "H_SAFETY"],
      ],
    },
    {
      slug: "memory-and-context",
      name: "MEMORY_AND_CONTEXT",
      section: "CONTEXT_MEDIA",
      iconName: "brain",
      headings: [
        ["summary", "H_SUMMARY"],
        ["retrieval", "H_RETRIEVAL"],
        ["web-search", "H_WEBSEARCH"],
        ["settings", "H_SETTINGS"],
      ],
    },
    {
      slug: "images",
      name: "IMAGES",
      section: "CONTEXT_MEDIA",
      iconName: "image",
      headings: [
        ["enable", "H_ENABLE"],
        ["flow", "H_FLOW"],
        ["models", "H_MODELS"],
        ["refs", "H_REFS"],
        ["styles", "H_STYLES"],
        ["preview", "H_PREVIEW"],
        ["inlays", "H_INLAYS"],
      ],
    },
    {
      slug: "custom-providers",
      name: "CUSTOM_PROVIDERS",
      section: "CONTEXT_MEDIA",
      iconName: "settings-2",
      headings: [
        ["add", "H_ADD"],
        ["models", "H_MODELS"],
        ["tokenizers", "H_TOKENIZERS"],
        ["group", "H_GROUP"],
        ["privacy", "H_PRIVACY"],
      ],
    },
    {
      slug: "data",
      name: "DATA",
      section: "DATA",
      iconName: "download",
      headings: [
        ["conversations", "H_CONVERSATIONS"],
        ["entities", "H_ENTITIES"],
        ["inspect", "H_INSPECT"],
        ["db", "H_DB"],
      ],
    },
    {
      slug: "janitorai-import",
      name: "JANITORAI_IMPORT",
      section: "DATA",
      iconName: "broom",
      headings: [
        ["how", "H_HOW"],
        ["desktop", "H_DESKTOP"],
        ["android", "H_ANDROID"],
        ["import", "H_IMPORT"],
        ["result", "H_RESULT"],
        ["limits", "H_LIMITS"],
      ],
    },
    {
      slug: "backups",
      name: "BACKUPS",
      section: "DATA",
      iconName: "cloud-upload",
      headings: [
        ["backup", "H_BACKUP"],
        ["restore", "H_RESTORE"],
        ["transfer", "H_TRANSFER"],
        ["size", "H_SIZE"],
        ["troubleshoot", "H_TROUBLESHOOT"],
      ],
    },
  ],
);

export const CHAT_DOC_SECTION_ORDER: ChatDocSection[] = [
  "GETTING_STARTED",
  "ENTITIES",
  "PROMPTING",
  "SCRIPTING",
  "CONTEXT_MEDIA",
  "DATA",
];

export const CHAT_DOC_SECTION_LABELS: Record<ChatDocSection, TranslationKey> = {
  GETTING_STARTED: "DOCS_CHAT.COMMON.SECTION_GETTING_STARTED",
  ENTITIES: "DOCS_CHAT.COMMON.SECTION_ENTITIES",
  PROMPTING: "DOCS_CHAT.COMMON.SECTION_PROMPTING",
  SCRIPTING: "DOCS_CHAT.COMMON.SECTION_SCRIPTING",
  CONTEXT_MEDIA: "DOCS_CHAT.COMMON.SECTION_CONTEXT_MEDIA",
  DATA: "DOCS_CHAT.COMMON.SECTION_DATA",
};
