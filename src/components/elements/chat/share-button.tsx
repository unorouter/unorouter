"use client";

import { Button } from "@/components/ui/button";
import {
  useConversationQuery,
  useRevokeShareMutation,
  useShareConversationMutation,
} from "@/hooks/chat-hook";
import { analytics } from "@/lib/analytics";
import { copyToClipboard, shareUrl } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuCheck, LuLink, LuLink2Off } from "react-icons/lu";

export function ShareButton(props: { convId: string }) {
  const t = useTranslations();
  const conversationQuery = useConversationQuery(props.convId);
  const shareMutation = useShareConversationMutation();
  const revokeMutation = useRevokeShareMutation();
  const [copied, setCopied] = useState(false);

  const existingShareId = conversationQuery.data?.shareId;
  const isPending = shareMutation.isPending || revokeMutation.isPending;

  const copyAndFlash = async (id: string) => {
    await copyToClipboard(shareUrl(id));
    analytics.chat.shareLinkCopied();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (existingShareId) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => copyAndFlash(existingShareId)}
          title={t("CHAT.COPY_SHARE_LINK")}
        >
          {copied ? (
            <LuCheck className="h-4 w-4 text-green-500" />
          ) : (
            <LuLink className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            analytics.chat.shareRevoked(props.convId);
            revokeMutation.mutate({ id: props.convId });
          }}
          disabled={isPending}
          title={t("CHAT.REVOKE_SHARE")}
        >
          <LuLink2Off className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => {
        analytics.chat.conversationShared(props.convId);
        shareMutation.mutate(
          { id: props.convId },
          { onSuccess: (data) => copyAndFlash(data.shareId) },
        );
      }}
      disabled={isPending}
      title={t("CHAT.SHARE")}
    >
      {copied ? (
        <LuCheck className="h-4 w-4 text-green-500" />
      ) : (
        <LuLink className="h-4 w-4" />
      )}
    </Button>
  );
}
