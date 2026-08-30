"use client";

import type { ChatUIMessage } from "@/lib/types";
import { useEffect, useRef } from "react";
import {
  broadcastDelta,
  broadcastMessage,
  broadcastStreamEnd,
  isHosting,
  onRunStateChange,
  speakerName,
} from "./host";

const textOf = (msg: ChatUIMessage) =>
  msg.parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("\n")
    .trim();

// Guests see the room by watching the host's own runtime state rather than by
// tapping the stream, so a message the host REWRITES is rebroadcast as a delta
// and both sides converge. A message the host DELETES does not: the protocol
// has no removal, so the guest keeps rendering it until the room closes.
export function useRoomBroadcast(
  messages: ChatUIMessage[],
  isRunning: boolean,
) {
  const sentText = useRef(new Map<string, string>());
  const wasRunning = useRef(false);

  useEffect(() => {
    if (!isHosting()) {
      if (sentText.current.size) sentText.current.clear();
      return;
    }
    for (const msg of messages) {
      if (msg.role !== "user" && msg.role !== "assistant") continue;
      const text = textOf(msg);
      const previous = sentText.current.get(msg.id);
      if (previous === text) continue;
      sentText.current.set(msg.id, text);
      if (previous === undefined) {
        broadcastMessage({
          id: msg.id,
          role: msg.role,
          speaker: speakerName(msg.role, msg.metadata?.speakingCharacterId),
          text,
        });
      } else {
        broadcastDelta(msg.id, text);
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!isHosting()) return;
    onRunStateChange(isRunning);
    if (wasRunning.current && !isRunning) {
      const last = messages.at(-1);
      if (last) broadcastStreamEnd(last.id);
    }
    wasRunning.current = isRunning;
  }, [isRunning, messages]);
}
