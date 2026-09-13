"use client";

import { TokenField } from "@/components/elements/theme/token-field";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { ThemeEditor } from "@/hooks/ui/use-theme-editor-hook";
import { TOKEN_BY_ID, tokensIn } from "@/lib/theme/tokens";
import {
  fileToScaledDataUrl,
  scaleDataUrl,
  wallpaperMaxDim,
} from "@/lib/utils/client";
import { useTranslations } from "next-intl";
import { useRef, type ReactNode } from "react";
import { toast } from "sonner";

export function BackgroundImageSection(props: {
  editor: ThemeEditor;
  modeTabs: ReactNode;
}) {
  const t = useTranslations();
  const { editor } = props;
  const fileRef = useRef<HTMLInputElement | null>(null);
  const image = editor.images[editor.scope];
  // A scope with no image of its own paints the app one; its sliders still
  // apply to the panels inside it.
  const inheritedImage = editor.scope === "app" ? undefined : editor.images.app;
  const shown = image ?? inheritedImage;

  const upload = async (file: File) => {
    try {
      const scaled = await fileToScaledDataUrl(file);
      editor.setImage(
        editor.scope,
        await scaleDataUrl(scaled, wallpaperMaxDim(), file.type),
      );
    } catch {
      toast.error(t("THEME.IMPORT_FAILED"), { position: "top-center" });
    }
  };

  return (
    <>
      <div className="flex items-center justify-end px-1">{props.modeTabs}</div>
      <TokenField def={TOKEN_BY_ID.get("background")!} editor={editor} />
      <TokenField def={TOKEN_BY_ID.get("sidebar")!} editor={editor} />
      {shown ? (
        <div className="ring-foreground/10 relative h-24 w-full overflow-hidden rounded-lg ring-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data-URL preview, next/image can't optimize it */}
          <img src={shown} alt="" className="h-full w-full object-cover" />
          {!image && (
            <span className="bg-background/70 text-muted-foreground absolute right-1 bottom-1 rounded px-1.5 py-0.5 text-[10px]">
              {t("THEME.INHERITED")}
            </span>
          )}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="upload" className="mr-1.5 size-3.5" />
          {image ? t("THEME.BG_REPLACE") : t("THEME.BG_UPLOAD")}
        </Button>
        {image && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => editor.setImage(editor.scope, null)}
          >
            <Icon name="trash-2" className="mr-1.5 size-3.5" />
            {t("THEME.BG_REMOVE")}
          </Button>
        )}
      </div>
      {shown &&
        tokensIn("wallpaper", editor.scope).map((def) => (
          <TokenField key={def.id} def={def} editor={editor} />
        ))}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </>
  );
}
