"use client";

import type { ChatUIMessage } from "@/lib/types";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { useEffect, useRef } from "react";
import {
  broadcastDelta,
  broadcastMessage,
  broadcastStreamEnd,
  isHosting,
  onRunStateChange,
  speakerName,
} from "./host";

const textOf = (msg: ChatUIMessage) => {
  const text = msg.parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("\n")
    .trim();
  // An attachment-only turn would broadcast as "" and render as a gap.
  if (text) return text;
  return msg.parts.some((p) => p.type === "file") ? "[attachment]" : "";
};

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
  // Deltas fire per render frame. Only 200 log entries persist, so logging each
  // one would flush every other event out of the bundle the user sends us.
  const deltaCount = useRef(new Map<string, number>());

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
        const speaker = speakerName(
          msg.role,
          msg.metadata?.speakingCharacterId,
        );
        logChatDebug("room.broadcast_append", {
          id: msg.id,
          role: msg.role,
          speaker,
          chars: text.length,
        });
        broadcastMessage({ id: msg.id, role: msg.role, speaker, text });
      } else {
        deltaCount.current.set(
          msg.id,
          (deltaCount.current.get(msg.id) ?? 0) + 1,
        );
        broadcastDelta(msg.id, text);
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!isHosting()) return;
    onRunStateChange(isRunning);
    if (wasRunning.current && !isRunning) {
      const last = messages.at(-1);
      if (last) {
        logChatDebug("room.broadcast_stream_end", {
          id: last.id,
          deltas: deltaCount.current.get(last.id) ?? 0,
        });
        deltaCount.current.delete(last.id);
        broadcastStreamEnd(last.id);
      }
    }
    wasRunning.current = isRunning;
  }, [isRunning, messages]);
}
