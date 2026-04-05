"use client";

import { Button } from "@/components/ui/button";
import {
  useConversationQuery,
  useRevokeShareMutation,
  useShareConversationMutation,
} from "@/hooks/chat-hook";
import { env } from "@/lib/config/env";
import { copyToClipboard } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuCheck, LuLink, LuLink2Off } from "react-icons/lu";

export function ShareButton(props: { convId: string }) {
  const t = useTranslations();
  const conversationQuery = useConversationQuery(props.convId);
  const shareMutation = useShareConversationMutation();
  const revokeMutation = useRevokeShareMutation();
  const [copied, setCopied] = useState(false);

  const shareId = conversationQuery.data?.shareId;
  const isPending = shareMutation.isPending || revokeMutation.isPending;

  if (shareId) {
    const shareUrl = `${env.appUrl}/shared/${shareId}`;
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={async () => {
            await copyToClipboard(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
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
          onClick={() => revokeMutation.mutate({ id: props.convId })}
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
      onClick={() =>
        shareMutation.mutate(
          { id: props.convId },
          {
            onSuccess: async (data) => {
              const url = `${env.appUrl}/shared/${data.shareId}`;
              await copyToClipboard(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            },
          },
        )
      }
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
