"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useRevokeShareMutation,
  useShareConversationMutation,
} from "@/hooks/chat-hook";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuCheck, LuCopy, LuLink, LuTrash2 } from "react-icons/lu";
import { toast } from "sonner";

type ShareDialogProps = {
  convId: string;
  shareId: string | null;
};

export function ShareDialog(props: ShareDialogProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareMutation = useShareConversationMutation();
  const revokeMutation = useRevokeShareMutation();

  const shareUrl = props.shareId
    ? `${window.location.origin}/shared/${props.shareId}`
    : null;

  const handleShare = () => {
    shareMutation.mutate(
      { id: props.convId },
      {
        onSuccess: () => {
          toast.success(t("CHAT.SHARE_CREATED"));
        },
      },
    );
  };

  const handleRevoke = () => {
    revokeMutation.mutate(
      { id: props.convId },
      {
        onSuccess: () => {
          toast.success(t("CHAT.SHARE_REVOKED"));
        },
      },
    );
  };

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t("CHAT.LINK_COPIED"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs transition-colors">
        <LuLink className="h-3.5 w-3.5" />
        {t("CHAT.SHARE")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("CHAT.SHARE_TITLE")}</DialogTitle>
          <DialogDescription>{t("CHAT.SHARE_DESCRIPTION")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {shareUrl ? (
            <>
              <div className="flex items-center gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? (
                    <LuCheck className="h-4 w-4" />
                  ) : (
                    <LuCopy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevoke}
                disabled={revokeMutation.isPending}
                className="w-full"
              >
                <LuTrash2 className="mr-2 h-3.5 w-3.5" />
                {t("CHAT.REVOKE_SHARE")}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleShare}
              disabled={shareMutation.isPending}
              className="w-full"
            >
              <LuLink className="mr-2 h-4 w-4" />
              {t("CHAT.GENERATE_LINK")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
