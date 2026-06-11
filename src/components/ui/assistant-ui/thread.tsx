"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { ConversationStats } from "@/components/pages/sidebar/chat/chat-elements";
import { ChatLoadout } from "@/components/pages/sidebar/chat/chat-loadout";
import { GreetingPreview } from "@/components/pages/sidebar/chat/greeting-preview";
import { RequestLogButton } from "@/components/pages/sidebar/chat/request-log/request-log-button";
import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/ui/assistant-ui/attachment";
import {
  Reasoning,
  ReasoningGroup,
} from "@/components/ui/assistant-ui/reasoning";
import { TaskCardRenderer } from "@/components/ui/assistant-ui/task-card";
import { ToolFallback } from "@/components/ui/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/ui/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteMessageMutation,
  useEditMessageMutation,
  useSetActiveBranchMutation,
} from "@/hooks/ai/chat-hook";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { useMessageMeta } from "@/hooks/ui/use-chat-hook";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { partsToItems } from "@/lib/ai/chat/messages";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/format/number";
import {
  chatHelpersAtom,
  chatModelAtom,
  chatStore,
  chatWebSearchAtom,
  convIdAtom,
  historyLoadedAtom,
} from "@/store/chat-store";
import { useMessageError } from "@assistant-ui/core/react";
import {
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  useAuiState,
  type TextMessagePartProps,
} from "@assistant-ui/react";
import { useAtom, useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FC,
} from "react";

const MarkdownText = dynamic<TextMessagePartProps>(
  () =>
    import("@/components/ui/assistant-ui/markdown-text").then(
      (m) => m.MarkdownText,
    ),
  { ssr: false },
);

const AssistantEditContext = createContext<(() => void) | null>(null);

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root bg-background @container flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "44rem",
        ["--composer-radius" as string]: "24px",
        ["--composer-padding" as string]: "10px",
      }}
    >
      <ThreadPrimitive.Viewport
        autoScroll
        className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-smooth px-4"
      >
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <ThreadWelcomeGate />
        </AuiIf>

        <ThreadPrimitive.Messages>
          {() => <ThreadMessage />}
        </ThreadPrimitive.Messages>

        <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer before:from-background bg-background pointer-events-none sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible rounded-t-(--composer-radius) pb-[max(--spacing(1),env(safe-area-inset-bottom))] *:pointer-events-auto before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-linear-to-t before:to-transparent md:pb-[max(--spacing(2.5),env(safe-area-inset-bottom))]">
          <ThreadScrollToBottom />
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);
  if (isEditing) return <EditComposer />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessage />;
};

const ThreadScrollToBottom: FC = () => {
  const t = useTranslations();
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip={t("CHAT.ACTION.SCROLL_TO_BOTTOM")}
        variant="outline"
        className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <Icon name="arrow-down" />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

// A conv URL starts with an empty runtime until the history adapter's load()
// imports the local messages; showing the welcome screen in that window reads
// as a flash. Skeleton until that first load resolved (historyLoadedAtom).
// New-chat routes have no convId and no pending history: welcome immediately.
const ThreadWelcomeGate: FC = () => {
  const params = useParams<{ convId?: string }>();
  const isLoading = useAuiState((s) => s.thread.isLoading);
  const historyLoaded = useAtomValue(historyLoadedAtom);
  const expectHistory = !!params.convId && !historyLoaded;
  if (isLoading || expectHistory) return <ThreadHistorySkeleton />;
  return <ThreadWelcome />;
};

const ThreadHistorySkeleton: FC = () => {
  return (
    <div className="mx-auto my-8 flex w-full max-w-(--thread-max-width) grow flex-col gap-6">
      <Skeleton className="h-16 w-2/5 self-end rounded-2xl" />
      <Skeleton className="h-28 w-4/5 rounded-2xl" />
      <Skeleton className="h-16 w-1/3 self-end rounded-2xl" />
      <Skeleton className="h-36 w-4/5 rounded-2xl" />
    </div>
  );
};

const ThreadWelcome: FC = () => {
  const t = useTranslations();
  return (
    <div className="aui-thread-welcome-root mx-auto my-auto flex w-full max-w-(--thread-max-width) grow flex-col pt-6">
      <div className="aui-thread-welcome-center flex w-full grow flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
            <Icon
              name="message-circle"
              className="text-muted-foreground h-8 w-8"
            />
          </div>
          <div className="text-center">
            <h1 className="text-foreground text-lg font-semibold">
              {t("CHAT.EMPTY_TITLE")}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("CHAT.EMPTY_DESCRIPTION")}
            </p>
          </div>
          <ChatLoadout />
          <GreetingPreview />
        </div>
      </div>
      <ThreadSuggestions />
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions grid w-full gap-2 pb-4 @md:grid-cols-2">
      <ThreadPrimitive.Suggestions>
        {() => <ThreadSuggestionItem />}
      </ThreadPrimitive.Suggestions>
    </div>
  );
};

const ThreadSuggestionItem: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200 nth-[n+3]:hidden @md:nth-[n+3]:block">
      <SuggestionPrimitive.Trigger send asChild>
        <Button
          variant="ghost"
          className="aui-thread-welcome-suggestion bg-background hover:bg-muted h-auto w-full flex-wrap items-start justify-start gap-1 rounded-3xl border px-4 py-3 text-left text-sm transition-colors @md:flex-col"
        >
          <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1 font-medium" />
          <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 text-muted-foreground empty:hidden" />
        </Button>
      </SuggestionPrimitive.Trigger>
    </div>
  );
};

const Composer: FC = () => {
  const t = useTranslations();
  const isMobile = useIsMobile();
  const convId = useAuiState((s) => s.threadListItem?.remoteId);
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <ConversationStats convId={convId ?? undefined} />
      <ComposerPrimitive.AttachmentDropzone asChild>
        <div
          data-slot="composer-shell"
          className="bg-background focus-within:border-ring/75 focus-within:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:bg-accent/50 flex w-full flex-col gap-2 rounded-(--composer-radius) border p-(--composer-padding) transition-shadow focus-within:ring-2 data-[dragging=true]:border-dashed"
        >
          <ComposerAttachments />
          <ComposerPrimitive.Input
            placeholder={t("CHAT.INPUT_PLACEHOLDER")}
            className="aui-composer-input placeholder:text-muted-foreground/80 max-h-32 min-h-10 w-full resize-none bg-transparent px-1.75 py-1 text-sm outline-none"
            rows={1}
            autoFocus
            aria-label={t("CHAT.MESSAGE_INPUT")}
            submitMode={isMobile ? "none" : "enter"}
          />
          <ComposerAction />
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const ComposerWebSearchToggle: FC = () => {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const [webSearch, setWebSearch] = useAtom(chatWebSearchAtom);
  if (!authQuery.data) return null;
  return (
    <TooltipIconButton
      tooltip={webSearch ? t("CHAT.WEB_SEARCH.ON") : t("CHAT.WEB_SEARCH.OFF")}
      variant={webSearch ? "default" : "ghost"}
      className="aui-composer-web-search size-8 rounded-full transition-colors"
      onClick={() => {
        analytics.chat.webSearchToggled(!webSearch);
        setWebSearch(!webSearch);
      }}
    >
      {webSearch ? (
        <Icon name="globe" className="size-4" />
      ) : (
        <Icon name="globe-lock" className="size-4" />
      )}
    </TooltipIconButton>
  );
};

const ComposerAction: FC = () => {
  const t = useTranslations();
  // Risu sendMain parity: empty composer + trailing unanswered user turn still
  // sends (argless send resubmits history so the turn gets its reply).
  const composerEmpty = useAuiState((s) => s.composer.text.trim().length === 0);
  const lastIsUser = useAuiState(
    (s) => s.thread.messages.at(-1)?.role === "user",
  );
  const helpers = useAtomValue(chatHelpersAtom);
  const emptySend = composerEmpty && lastIsUser && helpers != null;
  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between">
      <div className="flex items-center">
        <ComposerAddAttachment />
        <ComposerWebSearchToggle />
      </div>
      <AuiIf condition={(s) => !s.thread.isRunning}>
        {emptySend ? (
          <TooltipIconButton
            tooltip={t("CHAT.ACTION.SEND")}
            side="bottom"
            variant="default"
            className="aui-composer-send size-8 rounded-full"
            aria-label={t("CHAT.ACTION.SEND")}
            onClick={() => void helpers.sendEmpty()}
          >
            <Icon name="arrow-up" className="aui-composer-send-icon size-4" />
          </TooltipIconButton>
        ) : (
          <ComposerPrimitive.Send asChild>
            <TooltipIconButton
              tooltip={t("CHAT.ACTION.SEND")}
              side="bottom"
              variant="default"
              className="aui-composer-send size-8 rounded-full"
              aria-label={t("CHAT.ACTION.SEND")}
            >
              <Icon name="arrow-up" className="aui-composer-send-icon size-4" />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
        )}
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="aui-composer-cancel size-8 rounded-full"
            aria-label={t("CHAT.ACTION.STOP")}
          >
            <Icon
              name="square"
              className="aui-composer-cancel-icon size-3 fill-current"
            />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

type LooseT = {
  has: (key: string) => boolean;
  (key: string): string;
};

function unwrapJsonEnvelope(raw: string): string {
  if (!raw.startsWith("{") && !raw.startsWith("[")) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const m = (parsed as { message?: unknown }).message;
      if (typeof m === "string") return m;
    }
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === "string") return item;
        if (
          item &&
          typeof item === "object" &&
          typeof (item as { message?: unknown }).message === "string"
        ) {
          return (item as { message: string }).message;
        }
      }
    }
  } catch {}
  return raw;
}

function resolveErrorMessage(
  error: ReturnType<typeof useMessageError>,
  t: LooseT,
): string {
  if (error === undefined) return "";
  const raw = unwrapJsonEnvelope(
    typeof error === "string" ? error : String(error),
  );
  return t.has(raw) ? t(raw) : raw;
}

// Persisted failed attempt (error message_item -> data-error part): renders
// after refresh / on inactive branches, unlike MessageError which only covers
// the live run. Retry = the existing Refresh action (regenerate sibling).
const PersistedErrorPart: FC<{ data?: unknown }> = (props) => {
  const data = (props.data ?? {}) as { message?: string; model?: string };
  if (!data.message) return null;
  return (
    <div
      role="alert"
      className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200"
    >
      <span className="aui-message-error-message">
        {data.model ? `${data.model}: ${data.message}` : data.message}
      </span>
    </div>
  );
};

const MessageErrorBody: FC = () => {
  const error = useMessageError();
  const t = useTranslations() as unknown as LooseT;
  if (error === undefined) return null;
  return (
    <div
      role="alert"
      className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200"
    >
      <span className="aui-message-error-message">
        {resolveErrorMessage(error, t)}
      </span>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <MessageErrorBody />
    </MessagePrimitive.Error>
  );
};

const StreamingIndicator: FC = () => {
  const isStreaming = useAuiState(
    (s) => s.message.status?.type === "running" && s.message.parts.length === 0,
  );
  const [elapsed, setElapsed] = useState(0);
  const activeModel = useAtomValue(chatModelAtom);
  const pricing = usePricingQuery();

  useEffect(() => {
    if (!isStreaming) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 50);
    return () => clearInterval(id);
  }, [isStreaming]);

  if (!isStreaming) return null;

  const modelType = pricing.data?.models.find(
    (m) => m.name === activeModel,
  )?.type;
  // Image/video are slower than text; widen gradient so timer doesn't prematurely hit red.
  const gradientWindow =
    modelType === "image" ? 120 : modelType === "video" ? 300 : 60;

  const seconds = elapsed / 1000;
  const t = Math.min(seconds / gradientWindow, 1);
  const r = Math.round(140 + t * 115);
  const g = Math.round(140 - t * 100);
  const b = Math.round(140 - t * 110);
  const timerColor = `rgb(${r}, ${g}, ${b})`;
  const display = elapsed < 1000 ? `${elapsed}ms` : `${seconds.toFixed(1)}s`;

  return (
    <div className="flex items-center gap-2.5 px-1 py-2">
      <div className="flex items-center gap-1.5">
        <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:0ms]" />
        <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
        <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
      </div>
      <span
        className="font-mono text-[10px] tabular-nums transition-colors"
        style={{ color: timerColor }}
      >
        {display}
      </span>
    </div>
  );
};

const AssistantMessage: FC = () => {
  const [editing, setEditing] = useState(false);
  return (
    <AssistantEditContext.Provider value={() => setEditing(true)}>
      <MessagePrimitive.Root
        className="aui-assistant-message-root fade-in slide-in-from-bottom-1 animate-in relative mx-auto w-full max-w-(--thread-max-width) py-3 duration-150"
        data-role="assistant"
      >
        {editing ? (
          <AssistantEditInPlace onClose={() => setEditing(false)} />
        ) : (
          <>
            <AssistantMessageHeader />
            <div className="aui-assistant-message-content text-foreground px-2 leading-relaxed wrap-break-word">
              <StreamingIndicator />
              <MessagePrimitive.Parts
                components={{
                  Text: MarkdownText,
                  Reasoning,
                  ReasoningGroup,
                  tools: {
                    Fallback: ToolFallback,
                  },
                  data: {
                    // TaskCardRenderer draws the card below; suppress default render here.
                    by_name: { task: () => null, error: PersistedErrorPart },
                  },
                }}
              />
              <TaskCardRenderer />
              <MessageError />
            </div>

            <div className="aui-assistant-message-footer mt-1 ml-2 flex min-h-6 flex-wrap items-center gap-y-1">
              <BranchPicker />
              <AssistantActionBar />
              <AssistantMessageMeta />
            </div>
          </>
        )}
      </MessagePrimitive.Root>
    </AssistantEditContext.Provider>
  );
};

const AssistantEditInPlace: FC<{ onClose: () => void }> = (props) => {
  const t = useTranslations();
  const messageId = useAuiState((s) => s.message.id);
  const initialText = useAuiState((s) => {
    const parts = s.message.content as ReadonlyArray<{
      type: string;
      text?: string;
    }>;
    return parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text!)
      .join("\n\n");
  });
  const [text, setText] = useState(initialText);
  const editMut = useEditMessageMutation();

  const handleSave = async () => {
    const convId = chatStore.get(convIdAtom);
    if (!convId) return;

    const helpers = chatStore.get(chatHelpersAtom);
    // Only swap text parts; preserve reasoning/tool/source parts.
    const liveMsg = (
      helpers?.getMessages() as Array<{
        id: string;
        parts?: Array<{ type: string; [k: string]: unknown }>;
      }>
    )?.find((m) => m.id === messageId);

    const liveParts = liveMsg?.parts ?? [];
    const newParts: Array<{ type: string; [k: string]: unknown }> = [];
    let textInjected = false;
    for (const p of liveParts) {
      if (p.type === "text") {
        if (!textInjected) {
          newParts.push({ type: "text", text });
          textInjected = true;
        }
      } else {
        newParts.push(p);
      }
    }
    if (!textInjected) newParts.push({ type: "text", text });

    const items = partsToItems(newParts);

    await editMut.mutateAsync({
      convId,
      msgId: messageId,
      body: { items },
    });

    // Spread original message: dropping fields makes runtime treat turn as incomplete (phantom regenerate).
    helpers?.setMessages((msgs) => {
      const list = msgs as Array<{
        id: string;
        parts?: unknown[];
        [k: string]: unknown;
      }>;
      return list.map((m) =>
        m.id === messageId ? { ...m, parts: newParts } : m,
      );
    });

    props.onClose();
  };

  return (
    <div className="aui-assistant-edit-in-place flex flex-col gap-2 px-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(20, Math.max(4, text.split("\n").length + 1))}
        autoFocus
        className="font-sans text-sm"
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={props.onClose}
          disabled={editMut.isPending}
        >
          {t("CHAT.ACTION.CANCEL")}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={editMut.isPending}>
          {t("COMMON.SAVE")}
        </Button>
      </div>
    </div>
  );
};

const AssistantMessageMeta: FC = () => {
  const t = useTranslations();
  const messageIndex = useAuiState((s) => s.message.index);
  const meta = useMessageMeta(messageIndex);

  if (!meta) return null;

  const hasTokens = meta.inputTokens != null || meta.outputTokens != null;
  const hasCost = meta.cost != null && meta.cost > 0;
  if (!hasTokens && !hasCost) return null;

  return (
    <div className="text-muted-foreground ml-auto flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums">
      {hasTokens && (
        <>
          <span>
            {meta.inputTokens ?? 0} {t("CHAT.TOKENS_IN")}
          </span>
          <span>
            {meta.outputTokens ?? 0} {t("CHAT.TOKENS_OUT")}
          </span>
        </>
      )}
      {hasCost && (
        <>
          {hasTokens && <span className="opacity-40">|</span>}
          <span>{formatPrice(meta.cost!)}</span>
        </>
      )}
    </div>
  );
};

const AssistantMessageHeader: FC = () => {
  const messageIndex = useAuiState((s) => s.message.index);
  const meta = useMessageMeta(messageIndex);
  const pricingQuery = usePricingQuery();

  if (!meta?.model) return null;
  const modelData = pricingQuery.data?.models?.find(
    (m) => m.name === meta.model,
  );
  const vendorName =
    typeof modelData?.vendor === "string"
      ? modelData.vendor
      : (modelData?.vendor?.name ?? "");

  return (
    <div className="text-muted-foreground mb-1 ml-2 flex items-center gap-1.5 text-[11px]">
      {vendorName && <VendorIcon vendor={vendorName} size={12} />}
      <span className="opacity-70">{meta.model}</span>
    </div>
  );
};

const DeleteMessageButton: FC = () => {
  const t = useTranslations();
  const messageId = useAuiState((s) => s.message.id);
  const deleteMut = useDeleteMessageMutation();
  const [armed, setArmed] = useState(false);
  const disarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current);
    disarmTimerRef.current = null;
  };

  useEffect(() => clearTimer, []);

  const handleClick = () => {
    if (!armed) {
      setArmed(true);
      clearTimer();
      disarmTimerRef.current = setTimeout(() => setArmed(false), 3000);
      return;
    }

    clearTimer();
    setArmed(false);

    const convId = chatStore.get(convIdAtom);
    if (!convId) return;

    const helpers = chatStore.get(chatHelpersAtom);
    type Msg = { id: string; [k: string]: unknown };
    helpers?.setMessages((msgs) => {
      const list = msgs as Msg[];
      return list.filter((m) => m.id !== messageId);
    });

    deleteMut.mutate({ convId, msgId: messageId });
  };

  return (
    <TooltipIconButton
      tooltip={t("CHAT.ACTION.DELETE")}
      onClick={handleClick}
      onBlur={() => {
        clearTimer();
        setArmed(false);
      }}
      className={cn(
        armed &&
          "bg-destructive/15 text-destructive hover:bg-destructive/25 hover:text-destructive",
      )}
    >
      <Icon name="trash-2" />
    </TooltipIconButton>
  );
};

// Media-output messages hide Copy (giant data-uri) and Edit (meaningless for a generation).
const MEDIA_OUTPUT_RE = /^!\[(?:audio|image|video)\]\(/;

const AssistantActionBar: FC = () => {
  const t = useTranslations();
  const beginEdit = useContext(AssistantEditContext);
  const isMobile = useIsMobile();
  const messageId = useAuiState((s) => s.message.id);
  const isMediaOutput = useAuiState((s) => {
    const parts = s.message.content as ReadonlyArray<{
      type: string;
      text?: string;
    }>;
    const text = parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text!)
      .join("")
      .trim();
    return text.length > 0 && MEDIA_OUTPUT_RE.test(text);
  });
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide={isMobile ? undefined : "not-last"}
      className="aui-assistant-action-bar-root text-muted-foreground col-start-3 row-start-2 -ml-1 flex gap-1"
    >
      {!isMediaOutput && (
        <ActionBarPrimitive.Copy asChild>
          <TooltipIconButton tooltip={t("CHAT.ACTION.COPY")}>
            <AuiIf condition={(s) => s.message.isCopied}>
              <Icon name="check" />
            </AuiIf>
            <AuiIf condition={(s) => !s.message.isCopied}>
              <Icon name="copy" />
            </AuiIf>
          </TooltipIconButton>
        </ActionBarPrimitive.Copy>
      )}
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip={t("CHAT.ACTION.REFRESH")}>
          <Icon name="refresh-cw" />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <RequestLogButton msgId={messageId} />
      {beginEdit && !isMediaOutput && (
        <TooltipIconButton tooltip={t("CHAT.ACTION.EDIT")} onClick={beginEdit}>
          <Icon name="pencil" />
        </TooltipIconButton>
      )}
      <DeleteMessageButton />
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-user-message-root fade-in slide-in-from-bottom-1 animate-in mx-auto grid w-full max-w-(--thread-max-width) auto-rows-auto grid-cols-[minmax(72px,1fr)_minmax(0,auto)] content-start gap-y-2 px-2 py-3 duration-150 [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content peer bg-muted text-foreground col-start-2 max-w-full rounded-2xl px-4 py-2.5 wrap-break-word empty:hidden">
        <MessagePrimitive.Parts />
      </div>

      <div className="aui-user-message-footer col-span-full col-start-1 row-start-3 flex min-h-6 items-center justify-end gap-2 peer-empty:hidden">
        <UserActionBar />
        <BranchPicker className="aui-user-branch-picker -mr-1" />
      </div>
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  const t = useTranslations();
  const isMobile = useIsMobile();
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide={isMobile ? undefined : "not-last"}
      className="aui-user-action-bar-root text-muted-foreground flex gap-1"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip={t("CHAT.ACTION.EDIT")}>
          <Icon name="pencil" />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
      <DeleteMessageButton />
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  const t = useTranslations();
  const isMobile = useIsMobile();
  return (
    <MessagePrimitive.Root className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
      <ComposerPrimitive.Root className="aui-edit-composer-root bg-muted ml-auto flex w-full max-w-[85%] flex-col rounded-2xl">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input text-foreground min-h-14 w-full resize-none bg-transparent p-4 text-sm outline-none"
          autoFocus
          submitMode={isMobile ? "none" : "enter"}
        />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm">
              {t("CHAT.ACTION.CANCEL")}
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm">{t("CHAT.ACTION.UPDATE")}</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = (props) => {
  const t = useTranslations();
  // Persist active-branch flip server-side; gate on branchCount>1 to skip pre-persist temp ids.
  const messageId = useAuiState((s) => s.message.id);
  const branchCount = useAuiState((s) => s.message.branchCount);
  const setActiveBranchMut = useSetActiveBranchMutation();
  const lastIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!messageId) return;
    if (lastIdRef.current === null) {
      lastIdRef.current = messageId;
      return;
    }
    if (lastIdRef.current === messageId) return;
    lastIdRef.current = messageId;
    // Skip single-branch flips: fresh send/regenerate would POST a not-yet-persisted temp id (404).
    if (branchCount < 2) return;
    const convId = chatStore.get(convIdAtom);
    if (!convId) return;
    setActiveBranchMut.mutate({ convId, msgId: messageId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, branchCount]);
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root text-muted-foreground mr-2 -ml-2 inline-flex items-center text-xs",
        props.className,
      )}
      {...props}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip={t("CHAT.ACTION.PREVIOUS")}>
          <Icon name="chevron-left" />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip={t("CHAT.ACTION.NEXT")}>
          <Icon name="chevron-right" />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
