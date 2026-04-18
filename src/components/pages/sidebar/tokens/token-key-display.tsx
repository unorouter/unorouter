import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { LuCopy, LuEye, LuEyeOff, LuKey } from "react-icons/lu";

type TokenKeyDisplayProps = {
  displayKey: string;
  revealedKey: string | null;
  isEnabled: boolean;
  onToggleReveal: () => void;
  onCopyKey: () => void;
};

export function TokenKeyDisplay(props: TokenKeyDisplayProps) {
  const t = useTranslations();

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <LuKey className="text-muted-foreground h-4 w-4" />
        <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          {t("TOKEN.TABLE.KEY")}
        </span>
        <Badge
          variant={props.isEnabled ? "default" : "destructive"}
          className={props.isEnabled ? "bg-green-500/10 text-green-500" : ""}
        >
          {props.isEnabled ? t("TOKEN.ENUM.ENABLED") : t("TOKEN.ENUM.DISABLED")}
        </Badge>
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        <code className="bg-muted text-foreground block min-w-0 flex-1 truncate overflow-hidden rounded px-2 py-1.5 font-mono text-xs">
          {props.displayKey}
        </code>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={props.onToggleReveal}
                />
              }
            >
              {props.revealedKey ? (
                <LuEyeOff className="h-3.5 w-3.5" />
              ) : (
                <LuEye className="h-3.5 w-3.5" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {props.revealedKey
                ? t("TOKEN.KEY_DISPLAY.HIDE")
                : t("TOKEN.KEY_DISPLAY.REVEAL")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={props.onCopyKey}
                />
              }
            >
              <LuCopy className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent>{t("TOKEN.COPY_KEY")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
