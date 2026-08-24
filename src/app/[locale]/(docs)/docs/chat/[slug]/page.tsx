import {
  ChatDocTemplate,
  chatDocKey,
} from "@/components/pages/docs/chat/chat-doc-template";
import { getChatDoc } from "@/components/pages/docs/chat/chat-docs";
import { CardsContent } from "@/components/pages/docs/chat/content/cards-content";
import { CharactersContent } from "@/components/pages/docs/chat/content/characters-content";
import { CustomProvidersContent } from "@/components/pages/docs/chat/content/custom-providers-content";
import { PluginsContent } from "@/components/pages/docs/chat/content/plugins-content";
import { DataContent } from "@/components/pages/docs/chat/content/data-content";
import { BackupsContent } from "@/components/pages/docs/chat/content/backups-content";
import { GettingStartedContent } from "@/components/pages/docs/chat/content/getting-started-content";
import { GroupChatsContent } from "@/components/pages/docs/chat/content/group-chats-content";
import { ImagesContent } from "@/components/pages/docs/chat/content/images-content";
import { LorebooksContent } from "@/components/pages/docs/chat/content/lorebooks-content";
import { MacrosContent } from "@/components/pages/docs/chat/content/macros-content";
import { MemoryAndContextContent } from "@/components/pages/docs/chat/content/memory-and-context-content";
import { PersonasContent } from "@/components/pages/docs/chat/content/personas-content";
import { PresetsContent } from "@/components/pages/docs/chat/content/presets-content";
import { PromptTemplateContent } from "@/components/pages/docs/chat/content/prompt-template-content";
import { RegexScriptsContent } from "@/components/pages/docs/chat/content/regex-scripts-content";
import { TriggersAndLuaContent } from "@/components/pages/docs/chat/content/triggers-and-lua-content";
import { APP_VALUES } from "@/lib/config/constants";
import { DocPageSchema } from "@/lib/seo/json-ld";
import { getPageMetadata, notFoundMetadata, ogBadge } from "@/lib/seo/metadata";
import type { DocSlug } from "@/lib/types";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const doc = getChatDoc(params.slug);
  if (!doc) return notFoundMetadata();
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: doc.href,
    title: t(chatDocKey(doc.i18nPrefix, "META.TITLE"), APP_VALUES),
    description: t(chatDocKey(doc.i18nPrefix, "META.DESCRIPTION"), APP_VALUES),
    keywords: t(chatDocKey(doc.i18nPrefix, "META.KEYWORDS"), APP_VALUES),
    ogImage: ogBadge("chat", locale),
  });
}

const CONTENT: Record<string, React.ComponentType> = {
  "getting-started": GettingStartedContent,
  characters: CharactersContent,
  personas: PersonasContent,
  lorebooks: LorebooksContent,
  cards: CardsContent,
  presets: PresetsContent,
  "prompt-template": PromptTemplateContent,
  "group-chats": GroupChatsContent,
  macros: MacrosContent,
  "regex-scripts": RegexScriptsContent,
  "triggers-and-lua": TriggersAndLuaContent,
  "memory-and-context": MemoryAndContextContent,
  images: ImagesContent,
  "custom-providers": CustomProvidersContent,
  plugins: PluginsContent,
  data: DataContent,
  backups: BackupsContent,
};

export default async function ChatDocPage(props: PageProps) {
  const params = await props.params;
  const doc = getChatDoc(params.slug);
  const Content = doc ? CONTENT[doc.slug] : undefined;
  if (!doc || !Content) notFound();
  const t = await getTranslations();
  return (
    <>
      <DocPageSchema
        slug={`docs/chat/${doc.slug}` as DocSlug}
        title={t(chatDocKey(doc.i18nPrefix, "META.TITLE"), APP_VALUES)}
        description={t(
          chatDocKey(doc.i18nPrefix, "META.DESCRIPTION"),
          APP_VALUES,
        )}
      />
      <ChatDocTemplate doc={doc}>
        <Content />
      </ChatDocTemplate>
    </>
  );
}
