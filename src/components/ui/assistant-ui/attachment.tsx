"use client";

import { TooltipIconButton } from "@/components/ui/assistant-ui/tooltip-icon-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { FileText, PlusIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PropsWithChildren, useEffect, useState, type FC } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";

const useFileSrc = (file: File | undefined) => {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync src with file prop
      setSrc(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return src;
};

const useAttachmentSrc = () => {
  const { file, src } = useAuiState(
    useShallow((s): { file?: File; src?: string } => {
      if (s.attachment.type !== "image") return {};
      if (s.attachment.file) return { file: s.attachment.file };
      const src = s.attachment.content?.filter((c) => c.type === "image")[0]
        ?.image;
      if (!src) return {};
      return { src };
    }),
  );

  return useFileSrc(file) ?? src;
};

type AttachmentPreviewProps = {
  src: string;
};

const AttachmentPreview: FC<AttachmentPreviewProps> = (props) => {
  const t = useTranslations();
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={props.src}
      alt={t("CHAT.ATTACHMENT.IMAGE_PREVIEW")}
      className={cn(
        "block h-auto max-h-[80vh] w-auto max-w-full object-contain",
        isLoaded
          ? "aui-attachment-preview-image-loaded"
          : "aui-attachment-preview-image-loading invisible",
      )}
      onLoad={() => setIsLoaded(true)}
    />
  );
};

const AttachmentPreviewDialog: FC<PropsWithChildren> = (props) => {
  const t = useTranslations();
  const src = useAttachmentSrc();

  if (!src) return props.children;

  return (
    <Dialog>
      <DialogTrigger className="aui-attachment-preview-trigger hover:bg-accent/50 cursor-pointer transition-colors">
        {props.children}
      </DialogTrigger>
      <DialogContent className="aui-attachment-preview-dialog-content [&>button]:bg-foreground/60 [&_svg]:text-background [&>button]:hover:[&_svg]:text-destructive p-2 sm:max-w-3xl [&>button]:rounded-full [&>button]:p-1 [&>button]:opacity-100 [&>button]:ring-0!">
        <DialogTitle className="aui-sr-only sr-only">
          {t("CHAT.ATTACHMENT.IMAGE_PREVIEW_FULL")}
        </DialogTitle>
        <div className="aui-attachment-preview bg-background relative mx-auto flex max-h-[80dvh] w-full items-center justify-center overflow-hidden">
          <AttachmentPreview src={src} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AttachmentThumb: FC = () => {
  const t = useTranslations();
  const isImage = useAuiState((s) => s.attachment.type === "image");
  const src = useAttachmentSrc();

  return (
    <Avatar className="aui-attachment-tile-avatar h-full w-full rounded-none">
      <AvatarImage
        src={src}
        alt={t("CHAT.ATTACHMENT.PREVIEW")}
        className="aui-attachment-tile-image object-cover"
      />
      <AvatarFallback delay={isImage ? 200 : 0}>
        <FileText className="aui-attachment-tile-fallback-icon text-muted-foreground size-8" />
      </AvatarFallback>
    </Avatar>
  );
};

const AttachmentUI: FC = () => {
  const t = useTranslations();
  const aui = useAui();
  const isComposer = aui.attachment.source !== "message";

  const isImage = useAuiState((s) => s.attachment.type === "image");
  const typeLabel = useAuiState((s) => {
    const type = s.attachment.type;
    switch (type) {
      case "image":
        return t("CHAT.ATTACHMENT.IMAGE");
      case "document":
        return t("CHAT.ATTACHMENT.DOCUMENT");
      case "file":
        return t("CHAT.ATTACHMENT.FILE");
      default:
        return type;
    }
  });

  return (
    <Tooltip>
      <AttachmentPrimitive.Root
        className={cn(
          "aui-attachment-root relative",
          isImage && "aui-attachment-root-composer only:*:first:size-24",
        )}
      >
        <AttachmentPreviewDialog>
          <TooltipTrigger
            render={
              <div
                className="aui-attachment-tile bg-muted size-14 cursor-pointer overflow-hidden rounded-[calc(var(--composer-radius)-var(--composer-padding))] border transition-opacity hover:opacity-75"
                role="button"
                aria-label={`${typeLabel} ${t("CHAT.ATTACHMENT.LABEL")}`}
              />
            }
          >
            <AttachmentThumb />
          </TooltipTrigger>
        </AttachmentPreviewDialog>
        {isComposer && <AttachmentRemove />}
      </AttachmentPrimitive.Root>
      <TooltipContent side="top">
        <AttachmentPrimitive.Name />
      </TooltipContent>
    </Tooltip>
  );
};

const AttachmentRemove: FC = () => {
  const t = useTranslations();
  return (
    <AttachmentPrimitive.Remove asChild>
      <TooltipIconButton
        tooltip={t("CHAT.ACTION.REMOVE_FILE")}
        className="aui-attachment-tile-remove text-muted-foreground hover:[&_svg]:text-destructive absolute top-1.5 right-1.5 size-3.5 rounded-full bg-white opacity-100 shadow-sm hover:bg-white! [&_svg]:text-black"
        side="top"
      >
        <XIcon className="aui-attachment-remove-icon size-3 dark:stroke-[2.5px]" />
      </TooltipIconButton>
    </AttachmentPrimitive.Remove>
  );
};

export const UserMessageAttachments: FC = () => {
  return (
    <div className="aui-user-message-attachments-end col-span-full col-start-1 row-start-1 flex w-full flex-row justify-end gap-2">
      <MessagePrimitive.Attachments>
        {() => <AttachmentUI />}
      </MessagePrimitive.Attachments>
    </div>
  );
};

export const ComposerAttachments: FC = () => {
  return (
    <div className="aui-composer-attachments flex w-full flex-row items-center gap-2 overflow-x-auto empty:hidden">
      <ComposerPrimitive.Attachments>
        {() => <AttachmentUI />}
      </ComposerPrimitive.Attachments>
    </div>
  );
};

export const ComposerAddAttachment: FC = () => {
  const t = useTranslations();
  const aui = useAui();

  const addFile = async (file: File) => {
    try {
      await aui.composer().addAttachment(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(
        /not accepted/i.test(message)
          ? t("CHAT.ATTACHMENT.UNSUPPORTED_TYPE", {
              type: file.type || t("CHAT.ATTACHMENT.FILE"),
            })
          : message,
      );
    }
  };

  const handleClick = () => {
    const accept = aui.composer().getState().attachmentAccept;
    const input = Object.assign(document.createElement("input"), {
      type: "file",
      multiple: true,
      hidden: true,
      accept: accept === "*" ? "" : accept,
    });
    document.body.appendChild(input);

    const cleanup = () => input.remove();
    input.onchange = async () => {
      for (const file of input.files ?? []) await addFile(file);
      cleanup();
    };
    input.oncancel = cleanup;
    input.click();
  };

  return (
    <TooltipIconButton
      tooltip={t("CHAT.ACTION.ADD_ATTACHMENT")}
      side="bottom"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="aui-composer-add-attachment hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30 size-8 rounded-full p-1 text-xs font-semibold"
      aria-label={t("CHAT.ACTION.ADD_ATTACHMENT")}
    >
      <PlusIcon className="aui-attachment-add-icon size-5 stroke-[1.5px]" />
    </TooltipIconButton>
  );
};
