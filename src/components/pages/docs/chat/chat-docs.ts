import type { LinkHref } from "@/i18n/routing";
import type { TranslationKey } from "@/lib/config/constants";
import type { IconName } from "@/lib/config/icon-map";

export type ChatDocSection =
  | "GETTING_STARTED"
  | "ENTITIES"
  | "PROMPTING"
  | "SCRIPTING"
  | "CONTEXT_MEDIA"
  | "DATA";

export interface ChatDocHeading {
  id: string;
  i18nLeaf: string;
  level: 2 | 3;
}

export interface ChatDoc {
  slug: string;
  href: LinkHref;
  i18nPrefix: string;
  section: ChatDocSection;
  iconName: IconName;
  headings: ChatDocHeading[];
}

const chatDocHref = (slug: string): LinkHref => ({
  pathname: "/docs/chat/[slug]",
  params: { slug },
});

function chatDoc(input: {
  slug: string;
  name: string;
  section: ChatDocSection;
  iconName: IconName;
  headings: [string, string][];
}): ChatDoc {
  return {
    slug: input.slug,
    href: chatDocHref(input.slug),
    i18nPrefix: `DOCS_CHAT.${input.name}`,
    section: input.section,
    iconName: input.iconName,
    headings: input.headings.map(([id, leaf]) => ({
      id,
      i18nLeaf: leaf,
      level: 2,
    })),
  };
}

export const CHAT_DOCS: ChatDoc[] = [
  chatDoc({
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
      ["next", "H_NEXT"],
    ],
  }),
  chatDoc({
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
  }),
  chatDoc({
    slug: "personas",
    name: "PERSONAS",
    section: "ENTITIES",
    iconName: "users",
    headings: [
      ["fields", "H_FIELDS"],
      ["default", "H_DEFAULT"],
      ["import", "H_IMPORT"],
    ],
  }),
  chatDoc({
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
  }),
  chatDoc({
    slug: "cards",
    name: "CARDS",
    section: "ENTITIES",
    iconName: "layout-grid",
    headings: [
      ["concept", "H_CONCEPT"],
      ["apply", "H_APPLY"],
      ["export", "H_EXPORT"],
    ],
  }),
  chatDoc({
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
  }),
  chatDoc({
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
  }),
  chatDoc({
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
  }),
  chatDoc({
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
  }),
  chatDoc({
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
  }),
  chatDoc({
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
  }),
  chatDoc({
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
  }),
  chatDoc({
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
  }),
  chatDoc({
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
  }),
  chatDoc({
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
  }),
  chatDoc({
    slug: "backups",
    name: "BACKUPS",
    section: "DATA",
    iconName: "cloud-upload",
    headings: [
      ["why", "H_WHY"],
      ["backup", "H_BACKUP"],
      ["restore", "H_RESTORE"],
      ["size", "H_SIZE"],
      ["move", "H_MOVE"],
      ["troubleshoot", "H_TROUBLESHOOT"],
    ],
  }),
];

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

export function getChatDoc(slug: string): ChatDoc | undefined {
  return CHAT_DOCS.find((doc) => doc.slug === slug);
}

export function chatDocsBySection(): Record<ChatDocSection, ChatDoc[]> {
  const out = {
    GETTING_STARTED: [],
    ENTITIES: [],
    PROMPTING: [],
    SCRIPTING: [],
    CONTEXT_MEDIA: [],
    DATA: [],
  } as Record<ChatDocSection, ChatDoc[]>;
  for (const doc of CHAT_DOCS) out[doc.section].push(doc);
  return out;
}
