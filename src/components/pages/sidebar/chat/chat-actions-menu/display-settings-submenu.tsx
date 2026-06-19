import {
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { showStatsCostAtom, showStatsTokensAtom } from "@/store/chat-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";

export function DisplaySettingsSubmenu() {
  const t = useTranslations();
  const [showCost, setShowCost] = useAtom(showStatsCostAtom);
  const [showTokens, setShowTokens] = useAtom(showStatsTokensAtom);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon name="settings-2" className="size-4" />
        {t("CHAT.MORE.DISPLAY")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
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
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
