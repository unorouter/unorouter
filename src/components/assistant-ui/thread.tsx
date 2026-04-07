"use client";

import {
    ComposerAddAttachment,
    ComposerAttachments,
    UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { Reasoning, ReasoningGroup } from "@/components/assistant-ui/reasoning";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Button } from "@/components/ui/button";
import { usePricingQuery } from "@/hooks/pricing-hook";
import { viewportRef } from "@/hooks/ui/use-loaded-messages";
import { useMessageMeta } from "@/hooks/ui/use-chat-hook";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/base";
import { chatWebSearchAtom, getScrollControl } from "@/store/chat-store";
import {
    ActionBarPrimitive,
    AuiIf,
    BranchPickerPrimitive,
    ComposerPrimitive,
    ErrorPrimitive,
    MessagePrimitive,
    SuggestionPrimitive,
    ThreadPrimitive,
    useAuiState,
} from "@assistant-ui/react";
import { useAtom } from "jotai";
import {
    ArrowDownIcon,
    ArrowUpIcon,
    CheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CopyIcon,
    PencilIcon,
    RefreshCwIcon,
    SquareIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
    createContext,
    type FC,
    type UIEvent,
    useContext,
    useRef,
} from "react";
import { LuGlobe, LuGlobeLock, LuMessageCircle } from "react-icons/lu";

const ReadOnlyContext = createContext(false);

type ThreadProps = {
  readOnly?: boolean;
};

export const Thread: FC<ThreadProps> = (props) => {
  const nearTopRef = useRef(false);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const nearTop = e.currentTarget.scrollTop < 200;
    if (nearTop && !nearTopRef.current) {
      const ctrl = getScrollControl();
      if (ctrl.hasNextPage && !ctrl.isFetchingNextPage) {
        ctrl.fetchNextPage();
      }
    }
    nearTopRef.current = nearTop;
  };

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
          ref={(el) => {
            viewportRef.current = el;
          }}
          autoScroll
          onScroll={handleScroll}
          className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-smooth px-4"
        >
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <ThreadWelcome />
          </AuiIf>

          <ThreadPrimitive.Messages>
            {() => <ThreadMessage />}
          </ThreadPrimitive.Messages>

          {!props.readOnly && (
            <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer bg-background sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible rounded-t-(--composer-radius) pb-4 md:pb-6">
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
        tooltip={t("CHAT.SCROLL_TO_BOTTOM")}
        variant="outline"
        className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDownIcon />
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
            <LuMessageCircle className="text-muted-foreground h-8 w-8" />
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
          />
          <ComposerAction />
        </div>
      </ComposerPrimitive.AttachmentDropzone>
      <p className="text-muted-foreground mt-2 text-center text-[11px]">
        {t("CHAT.DISCLAIMER")}
      </p>
    </ComposerPrimitive.Root>
  );
};

const ComposerWebSearchToggle: FC = () => {
  const t = useTranslations();
  const [webSearch, setWebSearch] = useAtom(chatWebSearchAtom);
  return (
    <TooltipIconButton
      tooltip={webSearch ? t("CHAT.WEB_SEARCH_ON") : t("CHAT.WEB_SEARCH_OFF")}
      variant={webSearch ? "default" : "ghost"}
      className="aui-composer-web-search size-8 rounded-full transition-colors"
      onClick={() => setWebSearch(!webSearch)}
    >
      {webSearch ? (
        <LuGlobe className="size-4" />
      ) : (
        <LuGlobeLock className="size-4" />
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
            tooltip={t("CHAT.SEND_MESSAGE")}
            side="bottom"
            variant="default"
            className="aui-composer-send size-8 rounded-full"
            aria-label={t("CHAT.SEND_MESSAGE")}
          >
            <ArrowUpIcon className="aui-composer-send-icon size-4" />
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
            aria-label={t("CHAT.STOP_GENERATING")}
          >
            <SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const StreamingIndicator: FC = () => {
  const isStreaming = useAuiState(
    (s) => s.message.status?.type === "running" && s.message.parts.length === 0,
  );
  if (!isStreaming) return null;
  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:0ms]" />
      <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
      <span className="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
    </div>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-assistant-message-root fade-in slide-in-from-bottom-1 animate-in relative mx-auto w-full max-w-(--thread-max-width) py-3 duration-150"
      data-role="assistant"
    >
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
          }}
        />
        <MessageError />
      </div>

      <div className="aui-assistant-message-footer mt-1 ml-2 flex min-h-6 flex-wrap items-center gap-y-1">
        <BranchPicker />
        <AssistantActionBar />
        <AssistantMessageMeta />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessageMeta: FC = () => {
  const t = useTranslations();
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

  const hasTokens = meta.inputTokens != null || meta.outputTokens != null;

  return (
    <div className="text-muted-foreground ml-auto flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums">
      {vendorName && <VendorIcon vendor={vendorName} size={12} />}
      <span className="opacity-70">{meta.model}</span>
      {hasTokens && (
        <>
          <span className="opacity-40">|</span>
          <span>
            {meta.inputTokens ?? 0} {t("CHAT.TOKENS_IN")}
          </span>
          <span>
            {meta.outputTokens ?? 0} {t("CHAT.TOKENS_OUT")}
          </span>
        </>
      )}
      {meta.cost != null && meta.cost > 0 && (
        <>
          <span className="opacity-40">|</span>
          <span>{formatPrice(meta.cost)}</span>
        </>
      )}
    </div>
  );
};

const AssistantActionBar: FC = () => {
  const t = useTranslations();
  const readOnly = useContext(ReadOnlyContext);
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root text-muted-foreground col-start-3 row-start-2 -ml-1 flex gap-1"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip={t("CHAT.COPY")}>
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      {!readOnly && (
        <ActionBarPrimitive.Reload asChild>
          <TooltipIconButton tooltip={t("CHAT.REFRESH")}>
            <RefreshCwIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.Reload>
      )}
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-user-message-root fade-in slide-in-from-bottom-1 animate-in mx-auto grid w-full max-w-(--thread-max-width) auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3 duration-150 [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content peer bg-muted text-foreground rounded-2xl px-4 py-2.5 wrap-break-word empty:hidden">
          <MessagePrimitive.Parts />
        </div>
        <div className="aui-user-action-bar-wrapper absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2 peer-empty:hidden">
          <UserActionBar />
        </div>
      </div>

      <BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  const t = useTranslations();
  const readOnly = useContext(ReadOnlyContext);
  if (readOnly) return null;
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton
          tooltip={t("CHAT.EDIT")}
          className="aui-user-action-edit p-4"
        >
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  const t = useTranslations();
  return (
    <MessagePrimitive.Root className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
      <ComposerPrimitive.Root className="aui-edit-composer-root bg-muted ml-auto flex w-full max-w-[85%] flex-col rounded-2xl">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input text-foreground min-h-14 w-full resize-none bg-transparent p-4 text-sm outline-none"
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm">
              {t("CHAT.CANCEL")}
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm">{t("CHAT.UPDATE")}</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  const t = useTranslations();
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root text-muted-foreground mr-2 -ml-2 inline-flex items-center text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip={t("CHAT.PREVIOUS")}>
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip={t("CHAT.NEXT")}>
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
