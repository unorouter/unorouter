"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import {
    ComposerAddAttachment,
    ComposerAttachments,
    UserMessageAttachments,
} from "@/components/ui/assistant-ui/attachment";
import { MarkdownText } from "@/components/ui/assistant-ui/markdown-text";
import {
    Reasoning,
    ReasoningGroup,
} from "@/components/ui/assistant-ui/reasoning";
import { TaskCardRenderer } from "@/components/ui/assistant-ui/task-card";
import { ToolFallback } from "@/components/ui/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/ui/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { useAuthQuery } from "@/hooks/auth-hook";
import {
    useDeleteMessageMutation,
    useEditMessageMutation,
    useSetActiveBranchMutation,
} from "@/hooks/chat-hook";
import { usePricingQuery } from "@/hooks/pricing-hook";
import { useMessageMeta } from "@/hooks/ui/use-chat-hook";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { analytics } from "@/lib/analytics";
import { partsToItems } from "@/lib/playground/chat/messages";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/base";
import {
    chatModelAtom,
    chatWebSearchAtom,
    getChatHelpers,
    getConvId,
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
} from "@assistant-ui/react";
import { useAtom, useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import {
    createContext,
    type FC,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
const ReadOnlyContext = createContext(false);

const AssistantEditContext = createContext<(() => void) | null>(null);

type ThreadProps = {
  readOnly?: boolean;
};

export const Thread: FC<ThreadProps> = (props) => {
  return (
    <ReadOnlyContext.Provider value={!!props.readOnly}>
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
            <ThreadWelcome />
          </AuiIf>

          <ThreadPrimitive.Messages>
            {() => <ThreadMessage />}
          </ThreadPrimitive.Messages>

          {!props.readOnly && (
            <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer before:from-background pointer-events-none sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible rounded-t-(--composer-radius) pb-[max(--spacing(1),env(safe-area-inset-bottom))] *:pointer-events-auto before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-linear-to-t before:to-transparent md:pb-[max(--spacing(2.5),env(safe-area-inset-bottom))]">
              <ThreadScrollToBottom />
              <Composer />
            </ThreadPrimitive.ViewportFooter>
          )}
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </ReadOnlyContext.Provider>
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

const ThreadWelcome: FC = () => {
  const t = useTranslations();
  return (
    <div className="aui-thread-welcome-root mx-auto my-auto flex w-full max-w-(--thread-max-width) grow flex-col">
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
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
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
  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between">
      <div className="flex items-center">
        <ComposerAddAttachment />
        <ComposerWebSearchToggle />
      </div>
      <AuiIf condition={(s) => !s.thread.isRunning}>
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
  } catch {
  }
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
  // Image/video generation is expected to take much longer than a text turn,
  // so stretch the color gradient so the timer does not hit "red" prematurely.
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
                    // TaskCardRenderer reads data-task parts from runtime
                    // state and draws its own card below; suppress default
                    // rendering here.
                    by_name: { task: () => null },
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

/**
 * Bypasses `ActionBarPrimitive.Edit` / `ComposerPrimitive.Send` because
 * those always regenerate the run. Save persists the new text via PUT and
 * patches the AI SDK message buffer in place; reasoning and tool-call
 * parts are preserved untouched, only text parts are replaced. To re-roll,
 * use the existing Refresh action.
 */
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
    const convId = getConvId();
    if (!convId) return;

    const helpers = getChatHelpers();
    // Read the live AI SDK message so we preserve reasoning, tool calls,
    // sources, etc. We only swap text parts; everything else is kept.
    const liveMsg = (
      helpers as unknown as {
        messages?: Array<{
          id: string;
          parts?: Array<{ type: string; [k: string]: unknown }>;
        }>;
      } | null
    )?.messages?.find((m) => m.id === messageId);

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

    // Patch the AI SDK message in place: spread the original message so we
    // keep id, role, metadata, etc.; only replace `parts`. Without the
    // spread, the message becomes malformed and the runtime treats the
    // turn as incomplete (which kicked off a phantom regenerate before).
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

/**
 * Click-to-arm: first click reddens the button and starts a 3s disarm
 * timer; a second click while armed fires the delete (optimistic remove +
 * DELETE call). If the user moves on, the timer disarms without further
 * interaction.
 */
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

    const convId = getConvId();
    if (!convId) return;

    const helpers = getChatHelpers();
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

const AssistantActionBar: FC = () => {
  const t = useTranslations();
  const readOnly = useContext(ReadOnlyContext);
  const beginEdit = useContext(AssistantEditContext);
  const isMobile = useIsMobile();
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide={isMobile ? undefined : "not-last"}
      className="aui-assistant-action-bar-root text-muted-foreground col-start-3 row-start-2 -ml-1 flex gap-1"
    >
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
      {!readOnly && (
        <ActionBarPrimitive.Reload asChild>
          <TooltipIconButton tooltip={t("CHAT.ACTION.REFRESH")}>
            <Icon name="refresh-cw" />
          </TooltipIconButton>
        </ActionBarPrimitive.Reload>
      )}
      {!readOnly && beginEdit && (
        <TooltipIconButton tooltip={t("CHAT.ACTION.EDIT")} onClick={beginEdit}>
          <Icon name="pencil" />
        </TooltipIconButton>
      )}
      {!readOnly && <DeleteMessageButton />}
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
  const readOnly = useContext(ReadOnlyContext);
  const isMobile = useIsMobile();
  if (readOnly) return null;
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
  // Persist the active-branch flip server-side so refreshes preserve the
  // user's pick. assistant-ui's primitive flips the in-memory message id;
  // we watch it for changes and POST. Gating on `branchCount > 1` avoids
  // firing on the very first send (a freshly-created assistant message has
  // no server row yet, and its id is the AI SDK's temporary client id).
  const messageId = useAuiState((s) => s.message.id);
  const branchCount = useAuiState((s) => s.message.branchCount);
  const readOnly = useContext(ReadOnlyContext);
  const setActiveBranchMut = useSetActiveBranchMutation();
  const lastIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (readOnly) return;
    if (!messageId) return;
    if (lastIdRef.current === null) {
      lastIdRef.current = messageId;
      return;
    }
    if (lastIdRef.current === messageId) return;
    lastIdRef.current = messageId;
    // Only persist when this slot actually has multiple branches. Without
    // this gate, a fresh send/regenerate flips messageId (old assistant id ->
    // newly-streaming temp id) and we'd POST a not-yet-persisted id, getting
    // a 404 toast.
    if (branchCount < 2) return;
    const convId = getConvId();
    if (!convId) return;
    setActiveBranchMut.mutate({ convId, msgId: messageId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, branchCount, readOnly]);
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
