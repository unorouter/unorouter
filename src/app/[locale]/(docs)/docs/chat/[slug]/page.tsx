import { CHAT_DOCS } from "@/components/pages/docs/chat/chat-docs";
import { CardsContent } from "@/components/pages/docs/chat/content/cards-content";
import { CharactersContent } from "@/components/pages/docs/chat/content/characters-content";
import { CustomProvidersContent } from "@/components/pages/docs/chat/content/custom-providers-content";
import { PluginsContent } from "@/components/pages/docs/chat/content/plugins-content";
import { DataContent } from "@/components/pages/docs/chat/content/data-content";
import { JanitoraiImportContent } from "@/components/pages/docs/chat/content/janitorai-import-content";
import { BackupsContent } from "@/components/pages/docs/chat/content/backups-content";
import { ThemeContent } from "@/components/pages/docs/chat/content/theme-content";
import { GettingStartedContent } from "@/components/pages/docs/chat/content/getting-started-content";
import { GroupChatsContent } from "@/components/pages/docs/chat/content/group-chats-content";
import { ImagesContent } from "@/components/pages/docs/chat/content/images-content";
import { LorebooksContent } from "@/components/pages/docs/chat/content/lorebooks-content";
import { MacrosContent } from "@/components/pages/docs/chat/content/macros-content";
import { MemoryAndContextContent } from "@/components/pages/docs/chat/content/memory-and-context-content";
import { MultiplayerContent } from "@/components/pages/docs/chat/content/multiplayer-content";
import { PersonasContent } from "@/components/pages/docs/chat/content/personas-content";
import { PresetsContent } from "@/components/pages/docs/chat/content/presets-content";
import { PromptTemplateContent } from "@/components/pages/docs/chat/content/prompt-template-content";
import { RegexScriptsContent } from "@/components/pages/docs/chat/content/regex-scripts-content";
import { TriggersAndLuaContent } from "@/components/pages/docs/chat/content/triggers-and-lua-content";
import { docSlugRoute } from "@/components/pages/docs/doc-template";
import { ogBadge } from "@/lib/seo/metadata";

const route = docSlugRoute({
  docs: CHAT_DOCS,
  namespace: "DOCS_CHAT",
  indexHref: "/docs/chat",
  ogImage: (locale) => ogBadge("chat", locale),
  content: {
    "getting-started": GettingStartedContent,
    characters: CharactersContent,
    personas: PersonasContent,
    lorebooks: LorebooksContent,
    cards: CardsContent,
    presets: PresetsContent,
    "prompt-template": PromptTemplateContent,
    "group-chats": GroupChatsContent,
    multiplayer: MultiplayerContent,
    macros: MacrosContent,
    "regex-scripts": RegexScriptsContent,
    "triggers-and-lua": TriggersAndLuaContent,
    "memory-and-context": MemoryAndContextContent,
    images: ImagesContent,
    "custom-providers": CustomProvidersContent,
    plugins: PluginsContent,
    data: DataContent,
    "janitorai-import": JanitoraiImportContent,
    backups: BackupsContent,
    theme: ThemeContent,
  },
});

export const generateMetadata = route.generateMetadata;
export default route.Page;
