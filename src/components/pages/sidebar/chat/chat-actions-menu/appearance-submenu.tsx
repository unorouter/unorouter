"use client";

import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { matchPathname, useRouter } from "@/i18n/navigation";
import { LANGUAGES } from "@/lib/config/constants";
import {
  pullToRefreshAtom,
  showStatsCostAtom,
  showStatsMessagesAtom,
  showStatsTokensAtom,
  showThinkingTokensAtom,
} from "@/store/chat-store";
import { useAtom } from "jotai";
import type { Locale } from "next-intl";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

export function AppearanceSubmenu(props: { onOpenCustomizer: () => void }) {
  const t = useTranslations();
  const [showCost, setShowCost] = useAtom(showStatsCostAtom);
  const [showTokens, setShowTokens] = useAtom(showStatsTokensAtom);
  const [showMessages, setShowMessages] = useAtom(showStatsMessagesAtom);
  const [showThinking, setShowThinking] = useAtom(showThinkingTokensAtom);
  const [pullToRefresh, setPullToRefresh] = useAtom(pullToRefreshAtom);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();

  const switchLocale = (next: Locale) => {
    const matched = matchPathname(pathname, locale);
    if (matched) router.replace(matched, { locale: next });
    else router.replace("/", { locale: next });
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon name="paintbrush" className="size-4" />
        {t("CHAT.MORE.APPEARANCE")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <div className="md:hidden">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Icon name="paintbrush" className="size-4" />
              {t("THEME.TITLE")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => theme.setTheme("light")}>
                <Icon name="sun" className="size-4" />
                {t("THEME.LIGHT")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => theme.setTheme("dark")}>
                <Icon name="moon" className="size-4" />
                {t("THEME.DARK")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => theme.setTheme("system")}>
                <Icon name="monitor" className="size-4" />
                {t("THEME.SYSTEM")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={props.onOpenCustomizer}>
                <Icon name="sliders-horizontal" className="size-4" />
                {t("THEME.CUSTOMIZE")}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Icon name="globe" className="size-4" />
              {t("NAV.LANGUAGE")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.locale}
                  onClick={() => switchLocale(lang.locale)}
                >
                  <lang.Flag className="h-3.5 w-5 rounded-sm" />
                  {t(`LANGUAGE.${lang.code}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
        </div>
        <DropdownMenuCheckboxItem
          checked={showCost}
          onCheckedChange={setShowCost}
          closeOnClick={false}
        >
          {t("CHAT.STATS.SHOW_COST")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showTokens}
          onCheckedChange={setShowTokens}
          closeOnClick={false}
        >
          {t("CHAT.STATS.SHOW_TOKENS")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showMessages}
          onCheckedChange={setShowMessages}
          closeOnClick={false}
        >
          {t("CHAT.STATS.SHOW_MESSAGES")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showThinking}
          onCheckedChange={setShowThinking}
          closeOnClick={false}
        >
          {t("CHAT.STATS.SHOW_THINKING_TOKENS")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          className="md:hidden"
          checked={pullToRefresh}
          onCheckedChange={setPullToRefresh}
          closeOnClick={false}
        >
          {t("CHAT.MORE.PULL_TO_REFRESH")}
        </DropdownMenuCheckboxItem>
        {/* Desktop reaches the theme menu from the header, but the customizer
            is only offered there, so without this it is unreachable here. */}
        <DropdownMenuSeparator className="max-md:hidden" />
        <DropdownMenuItem
          className="max-md:hidden"
          onClick={props.onOpenCustomizer}
        >
          <Icon name="sliders-horizontal" className="size-4" />
          {t("THEME.CUSTOMIZE")}
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
