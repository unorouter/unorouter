"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  clearRoomError,
  roomActions,
  startRoom,
  stopRoom,
} from "@/lib/ai/chat/room/host";
import type { TranslationKey } from "@/lib/types";
import { convIdAtom } from "@/store/chat-store";
import {
  roomErrorAtom,
  roomHostStatusAtom,
  roomIdAtom,
  roomParticipantsAtom,
  roomPendingAtom,
  type RoomHostStatus,
} from "@/store/room-store";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const STATUS_KEY: Record<RoomHostStatus, TranslationKey> = {
  off: "ROOM.HOST_STATUS_OFF",
  starting: "ROOM.HOST_STATUS_STARTING",
  open: "ROOM.HOST_STATUS_OPEN",
  error: "ROOM.HOST_STATUS_ERROR",
};

export function RoomHostPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const params = useParams<{ convId?: string }>();
  const convIdFromStore = useAtomValue(convIdAtom);
  const convId = params.convId ?? convIdFromStore;
  const status = useAtomValue(roomHostStatusAtom);
  const roomId = useAtomValue(roomIdAtom);
  const error = useAtomValue(roomErrorAtom);
  const pending = useAtomValue(roomPendingAtom);
  const participants = useAtomValue(roomParticipantsAtom);

  useEffect(() => {
    if (props.open) clearRoomError();
  }, [props.open]);

  const link =
    roomId && typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : "";

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("ROOM.HOST_TITLE")}</DialogTitle>
          <DialogDescription>{t("ROOM.HOST_COST_WARNING")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {/* A room hosts an existing conversation, so an empty chat has
                nothing to share. Saying so beats a disabled button. */}
            {convId ? t(STATUS_KEY[status]) : t("ROOM.NEEDS_CONVERSATION")}
            {error ? ` (${error})` : ""}
          </p>

          {status === "off" || status === "error" ? (
            <Button onClick={() => void startRoom(convId)} disabled={!convId}>
              {t("ROOM.HOST_START")}
            </Button>
          ) : (
            <div className="space-y-3">
              {link ? (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={link}
                    onFocus={(e) => e.target.select()}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(link);
                      toast.success(t("ROOM.LINK_COPIED"));
                    }}
                  >
                    {t("ROOM.COPY_LINK")}
                  </Button>
                </div>
              ) : null}

              {pending.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("ROOM.PENDING")}</p>
                  {pending.map((join) => (
                    <div
                      key={join.peerId}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate text-sm">{join.name}</span>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          onClick={() => void roomActions.admit(join.peerId)}
                        >
                          {t("ROOM.ADMIT")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => roomActions.reject(join.peerId)}
                        >
                          {t("ROOM.REJECT")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t("ROOM.PARTICIPANT_COUNT", { count: participants.length })}
                </p>
                {participants.map((guest) => (
                  <div
                    key={guest.peerId}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-sm">{guest.name}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => roomActions.kick(guest.peerId)}
                    >
                      {t("ROOM.KICK")}
                    </Button>
                  </div>
                ))}
              </div>

              <Button variant="destructive" onClick={() => stopRoom()}>
                {t("ROOM.HOST_STOP")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
