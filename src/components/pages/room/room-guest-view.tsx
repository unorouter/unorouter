"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { joinRoom, leaveRoom, submitTurn } from "@/lib/ai/chat/room/guest";
import { MAX_TURN_CHARS } from "@/lib/ai/chat/room/protocol";
import { cn } from "@/lib/utils";
import {
  type GuestStatus,
  guestCharacterNameAtom,
  guestErrorAtom,
  guestMessagesAtom,
  guestParticipantsAtom,
  guestStatusAtom,
  guestTitleAtom,
  guestTurnAtom,
  roomStore,
} from "@/store/room-store";
import type { TranslationKey } from "@/lib/types";
import { TextMessagePartProvider } from "@assistant-ui/react";
import { Provider, useAtomValue } from "jotai";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

// The host's own renderer, so a guest sees the same italics, bold and quote
// styling instead of the raw asterisks.
const MarkdownText = dynamic(
  () =>
    import("@/components/ui/assistant-ui/markdown-text").then(
      (m) => m.StandaloneMarkdownText,
    ),
  { ssr: false },
);

const STATUS_KEY: Record<GuestStatus, TranslationKey> = {
  connecting: "ROOM.STATUS_CONNECTING",
  waiting: "ROOM.STATUS_WAITING",
  joined: "ROOM.STATUS_JOINED",
  rejected: "ROOM.STATUS_REJECTED",
  closed: "ROOM.STATUS_CLOSED",
  error: "ROOM.STATUS_ERROR",
};

// Rejection reasons from the host. Anything unrecognised falls back to a
// generic line rather than rendering a raw protocol token.
const ERROR_KEY: Record<string, TranslationKey> = {
  declined: "ROOM.ERROR_DECLINED",
  version: "ROOM.ERROR_VERSION",
  full: "ROOM.ERROR_FULL",
  busy: "ROOM.ERROR_BUSY",
  timeout: "ROOM.ERROR_TIMEOUT",
};

// Deliberately dumb: no runtime, no adapters, no database. Everything rendered
// here arrived over the wire and is discarded when the tab closes.
export function RoomGuestView(props: { roomId: string }) {
  return (
    <Provider store={roomStore}>
      <GuestSession roomId={props.roomId} />
    </Provider>
  );
}

function GuestSession(props: { roomId: string }) {
  const t = useTranslations();
  const status = useAtomValue(guestStatusAtom);
  const error = useAtomValue(guestErrorAtom);
  const messages = useAtomValue(guestMessagesAtom);
  const title = useAtomValue(guestTitleAtom);
  const characterName = useAtomValue(guestCharacterNameAtom);
  const participants = useAtomValue(guestParticipantsAtom);
  const turn = useAtomValue(guestTurnAtom);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [entered, setEntered] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    return () => leaveRoom();
  }, []);

  if (!entered) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="text-xl font-semibold">{t("ROOM.JOIN_TITLE")}</h1>
        <p className="text-muted-foreground text-sm">{t("ROOM.JOIN_NOTE")}</p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("ROOM.NAME_PLACEHOLDER")}
          autoFocus
        />
        <Button
          disabled={!name.trim()}
          onClick={() => {
            setEntered(true);
            void joinRoom(props.roomId, name);
          }}
        >
          {t("ROOM.JOIN_ACTION")}
        </Button>
      </div>
    );
  }

  if (status !== "joined") {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-3 p-6 text-center">
        <p className="text-lg font-medium">{t(STATUS_KEY[status])}</p>
        {error ? (
          <p className="text-muted-foreground text-sm">
            {t(ERROR_KEY[error] ?? "ROOM.ERROR_UNKNOWN")}
          </p>
        ) : null}
      </div>
    );
  }

  const canWrite = turn.kind === "idle";
  const remaining = MAX_TURN_CHARS - draft.length;

  return (
    <div className="mx-auto flex h-svh max-w-3xl flex-col">
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{title || characterName}</p>
          <p className="text-muted-foreground text-xs">
            {t("ROOM.PARTICIPANT_COUNT", { count: participants.length })}
          </p>
        </div>
        <span className="text-muted-foreground shrink-0 text-xs">
          {t("ROOM.EPHEMERAL_BADGE")}
        </span>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Same treatment as the host thread: a written turn gets the muted
            bubble and sits right, the reply runs full width. Without the
            bubble the turns run together and scrolling back is a guess. */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col gap-1",
              msg.role === "user" && "items-end",
            )}
          >
            <p className="text-muted-foreground px-1 text-xs font-medium">
              {msg.speaker}
            </p>
            <div
              className={cn(
                "max-w-full text-sm wrap-break-word",
                msg.role === "user"
                  ? "bg-muted text-foreground rounded-2xl px-4 py-2.5"
                  : "text-foreground leading-relaxed",
              )}
            >
              <TextMessagePartProvider text={msg.text}>
                <MarkdownText />
              </TextMessagePartProvider>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <footer className="shrink-0 space-y-2 border-t p-3">
        {turn.kind !== "idle" ? (
          <p className="text-muted-foreground text-xs">
            {turn.kind === "generating"
              ? t("ROOM.TURN_GENERATING")
              : t("ROOM.TURN_WRITING", { name: turn.name })}
          </p>
        ) : null}
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_TURN_CHARS))}
          placeholder={t("ROOM.COMPOSER_PLACEHOLDER")}
          disabled={!canWrite}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && canWrite && draft.trim()) {
              e.preventDefault();
              submitTurn(draft);
              setDraft("");
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            {remaining < 200 ? remaining : ""}
          </span>
          <Button
            size="sm"
            disabled={!canWrite || !draft.trim()}
            onClick={() => {
              submitTurn(draft);
              setDraft("");
            }}
          >
            {t("ROOM.SEND")}
          </Button>
        </div>
      </footer>
    </div>
  );
}
