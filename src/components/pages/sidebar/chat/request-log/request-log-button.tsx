"use client";

import { TooltipIconButton } from "@/components/ui/assistant-ui/tooltip-icon-button";
import { Icon } from "@/components/ui/icon";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { readLocalRequestLog } from "@/lib/db/client/data/request-log";
import { queryKeys } from "@/lib/react-query/keys";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { RequestLogSheet } from "./request-log-sheet";

export function RequestLogButton(props: { msgId: string }) {
  const t = useTranslations();
  const auth = useAuthQuery();
  const userId = auth.data?.id ?? GUEST_USER_ID;
  const [open, setOpen] = useState(false);

  const peek = useQuery({
    queryKey: queryKeys.requestLog(props.msgId),
    queryFn: () => readLocalRequestLog(userId, props.msgId),
    enabled: !!props.msgId,
  });

  if (!peek.data) return null;

  return (
    <>
      <TooltipIconButton
        tooltip={t("CHAT.REQUEST_LOG.VIEW")}
        onClick={() => setOpen(true)}
      >
        <Icon name="terminal" />
      </TooltipIconButton>
      {open && (
        <RequestLogSheet
          msgId={props.msgId}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
