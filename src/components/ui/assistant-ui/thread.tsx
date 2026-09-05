"use client";

import type { CssVars } from "@/lib/types";
import { Link } from "@/i18n/navigation";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { SectionBoundary } from "@/components/elements/feedback/section-boundary";
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
import { useCustomProvidersQuery } from "@/hooks/ai/custom-providers-hook";
import { useForkConversationMutation } from "@/hooks/ai/rp/conversations";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { usePricingCatalogQuery } from "@/hooks/models/pricing-hook";
import {
  useMessageMeta,
  useStreamFlag,
  useLorebookSpeaker,
  useSpeakingCharacter,
} from "@/hooks/ui/use-chat-hook";
import { useHydrated } from "@/hooks/ui/use-hydrated";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import {
  isCustomModelId,
  parseCustomModelId,
} from "@/lib/ai/chat/custom-provider-id";
import { partsToItems } from "@/lib/ai/chat/messages";
import { analytics } from "@/lib/analytics";
import { env } from "@/lib/config/env";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/utils/base";
import { extractErrorDetail } from "@/lib/utils/client";
import { formatPrice } from "@/lib/utils/format/number";
import {
  chatLoadoutAtom,
  chatModelAtom,
  chatRunningAtom,
  chatStore,
  chatWebSearchAtom,
  convIdAtom,
  historyLoadedAtom,
  messageEditingAtom,
  reloadLiveThreadFromDb,
  replaceMessageParts,
} from "@/store/chat-store";
import { readLocalPreset } from "@/lib/db/client/data/rp/rp";
import { useMessageError } from "@assistant-ui/core/react";
import {
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  getExternalStoreMessages,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
  type TextMessagePartProps,
} from "@assistant-ui/react";
import { NONE_VALUE } from "@/lib/config/constants";
import { useStorageBlocked } from "@/hooks/ai/use-storage-blocked";
import { useChatSettingsQuery } from "@/hooks/ai/rp/conversations";
import { updateLocalConversationSettings } from "@/lib/db/client/data/chat/chat";
import { usePersonasQuery } from "@/hooks/ai/rp/personas";
import { RpAvatar } from "@/components/pages/sidebar/chat/rp/shared/rp-list-parts";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import {
  createContext,
  type FC,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const MarkdownText = dynamic<TextMessagePartProps>(
  () =>
    import("@/components/ui/assistant-ui/markdown-text").then(
      (m) => m.MarkdownText,
    ),
  { ssr: false },
);

const AssistantEditContext = createContext<(() => void) | null>(null);

const THREAD_VARS: CssVars = {
  "--thread-max-width": "44rem",
  "--composer-radius": "24px",
  "--composer-padding": "10px",
};

export const Thread: FC = () => {
  const autoScrollStream = useStreamFlag("autoScrollStream");
  const viewportRef = useRef<HTMLDivElement>(null);
  // The library's one jump on open fires before a long history has rendered,
  // so a chat opened with the setting off landed partway up. Follow the
  // bottom until the rendered history stops growing, then honor the setting.
  const params = useParams<{ convId?: string }>();
  const historyLoaded = useAtomValue(historyLoadedAtom);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const el = viewportRef.current;
    if (!historyLoaded || !el) return;
    // Polled rather than observed: the nodes present at load are the skeleton,
    // and the message list that replaces them is what grows.
    let lastHeight = -1;
    let stableSince = Date.now();
    const started = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      if (el.scrollHeight !== lastHeight) {
        lastHeight = el.scrollHeight;
        stableSince = now;
      }
      if (now - stableSince > 400 || now - started > 8000) {
        clearInterval(timer);
        setSettled(true);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [historyLoaded]);
  const settling = !!params.convId && !settled;
  useEffect(() => {
    logChatDebug("viewport.autoscroll", { autoScrollStream });
  }, [autoScrollStream]);
  // The viewport library keeps a pending scroll-to-bottom that it re-applies
  // on every content resize until it observes the bottom, ignoring autoScroll.
  // Six weeks of chasing that state machine did not make the toggle reliable,
  // so the invariant is enforced here instead: with the setting off, a
  // programmatic scroll during a reply is dropped unless the user just
  // touched the viewport. A synthetic pointerdown at run start is the
  // library's own cancel path for that pending scroll.
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const runningRef = useRef(false);
  useEffect(() => {
    runningRef.current = isRunning;
    chatStore.set(chatRunningAtom, isRunning);
    if (!isRunning || autoScrollStream) return;
    viewportRef.current?.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: false }),
    );
  }, [isRunning, autoScrollStream]);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const native = el.scrollTo.bind(el);
    let calls = 0;
    let lastLog = 0;
    let lastInput = 0;
    const markInput = (e: Event) => {
      if (e.isTrusted) lastInput = Date.now();
    };
    el.addEventListener("wheel", markInput, { passive: true });
    el.addEventListener("touchstart", markInput, { passive: true });
    el.addEventListener("pointerdown", markInput);
    el.addEventListener("keydown", markInput);
    // Direct scrollTop writes get a stack; any other move during a run that no
    // input explains (focus, scroll anchoring) is logged with what preceded it.
    let lastFocus = 0;
    let lastSetter = 0;
    let lastTop = el.scrollTop;
    let lastMoveLog = 0;
    const markFocus = () => {
      lastFocus = Date.now();
    };
    document.addEventListener("focusin", markFocus);
    document.addEventListener("selectionchange", markFocus);
    const stackOf = () =>
      (new Error().stack ?? "")
        .split("\n")
        .slice(2, 6)
        .map((l) => l.trim().slice(0, 70))
        .join(" | ");
    const desc = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "scrollTop",
    );
    const getter = desc?.get;
    const setter = desc?.set;
    if (getter && setter) {
      Object.defineProperty(el, "scrollTop", {
        configurable: true,
        get: () => getter.call(el),
        set: (value: number) => {
          const now = Date.now();
          if (runningRef.current && now - lastSetter > 1000) {
            logChatDebug("viewport.scroll_top_set", {
              value: Math.round(value),
              top: Math.round(getter.call(el)),
              autoScrollStream,
              stack: stackOf(),
            });
          }
          lastSetter = now;
          setter.call(el, value);
        },
      });
    }
    const onScroll = () => {
      const top = el.scrollTop;
      const delta = top - lastTop;
      lastTop = top;
      const now = Date.now();
      if (!runningRef.current || Math.abs(delta) < 4) return;
      if (now - lastInput < 1000 || now - lastMoveLog < 1000) return;
      lastMoveLog = now;
      logChatDebug("viewport.moved", {
        delta: Math.round(delta),
        top: Math.round(top),
        fromBottom: Math.round(el.scrollHeight - top - el.clientHeight),
        autoScrollStream,
        sinceInputMs: lastInput ? now - lastInput : null,
        sinceFocusMs: lastFocus ? now - lastFocus : null,
        sinceSetterMs: lastSetter ? now - lastSetter : null,
        active: document.activeElement?.tagName ?? null,
        reasoningOpen: el.querySelectorAll(
          '[data-slot="reasoning-content"][data-state="open"]',
        ).length,
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.scrollTo = (a?: ScrollToOptions | number, b?: number): void => {
      calls++;
      const now = Date.now();
      const blocked =
        !autoScrollStream && runningRef.current && now - lastInput > 1000;
      if (now - lastLog > 1000) {
        lastLog = now;
        logChatDebug("viewport.scroll_to", {
          calls,
          blocked,
          arg: typeof a === "number" ? `${a},${b}` : JSON.stringify(a),
          autoScrollStream,
          fromBottom: Math.round(
            el.scrollHeight - el.scrollTop - el.clientHeight,
          ),
          sinceInputMs: lastInput ? now - lastInput : null,
          stack: stackOf(),
        });
      }
      if (blocked) return;
      if (typeof a === "number") native(a, b ?? 0);
      else native(a);
    };
    return () => {
      el.scrollTo = native;
      Reflect.deleteProperty(el, "scrollTop");
      el.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", markFocus);
      document.removeEventListener("selectionchange", markFocus);
      el.removeEventListener("wheel", markInput);
      el.removeEventListener("touchstart", markInput);
      el.removeEventListener("pointerdown", markInput);
      el.removeEventListener("keydown", markInput);
    };
  }, [autoScrollStream]);
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root bg-background @container flex min-h-0 flex-1 flex-col"
      style={THREAD_VARS}
    >
      {/* autoScroll alone only gates the content-resize branch; the run-start
          jump is a separate default that still fired with the setting off, so
          the toggle looked broken. Both follow the preference now. */}
      <ThreadPrimitive.Viewport
        ref={viewportRef}
        autoScroll={autoScrollStream || settling}
        scrollToBottomOnRunStart={autoScrollStream}
        className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-smooth px-4"
      >
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <ThreadWelcomeGate />
        </AuiIf>

        <ThreadPrimitive.Messages>
          {() => <ThreadMessage />}
        </ThreadPrimitive.Messages>

        {/* sticky bottom-0 INSIDE the scroller (not fixed to the viewport):
            when the iOS keyboard pans the visual viewport, Safari scrolls the
            focused field's nearest scroll container, and a sticky footer rides
            up with that same pass - a viewport-anchored footer stays pinned to
            the full-height layout viewport and ends up under the keyboard.
            Every glitch-free reference client keeps the composer inside the
            scroller's coordinate space; it is also what assistant-ui's docs
            recommend for ViewportFooter. */}
        <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer bg-background sticky bottom-0 z-10 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible rounded-t-(--composer-radius) pb-[max(--spacing(1),env(safe-area-inset-bottom))] md:pb-[max(--spacing(2.5),env(safe-area-inset-bottom))]">
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
  // It floats directly above the composer, which is where the edit box opens,
  // so while editing it covers the line being typed.
  const isEditingMessage = useAtomValue(messageEditingAtom);
  if (isEditingMessage) return null;
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

const ThreadWelcomeGate: FC = () => {
  const params = useParams<{ convId?: string }>();
  const hydrated = useHydrated();
  const isLoading = useAuiState((s) => s.thread.isLoading);
  const historyLoaded = useAtomValue(historyLoadedAtom);
  const expectHistory = !!params.convId && !historyLoaded;
  // The server evaluates thread.isEmpty false, so the AuiIf slot SSRs empty; rendering the welcome
  // during the hydration pass mismatches that HTML (React #418). Match the server first, then show.
  if (!hydrated) return null;
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
          {/* Users arriving from JanitorAI/SillyTavern assume a web app stores
              chats server-side, then ask whether we read them. Say it up front,
              next to where the backup that this implies is explained. */}
          <Link
            href={{
              pathname: "/docs/chat/[slug]",
              params: { slug: "backups" },
            }}
            className="border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:border-border flex max-w-md items-start gap-2 rounded-lg border px-3 py-2 text-xs transition-colors"
          >
            <Icon name="shield-check" className="mt-0.5 size-3.5 shrink-0" />
            <span>{t("CHAT.LOCAL_ONLY_NOTICE")}</span>
          </Link>
          <StorageBlockedNotice />
          <ChatLoadout />
          <GreetingPreview />
          {env.discordUrl && (
            <a
              href={env.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              <Icon name="brand-discord" className="h-3.5 w-3.5" />
              {t("CHAT.DISCORD_CTA")}
            </a>
          )}
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

// The draft lives on the conversation row, so a reload, a crash or a closed
// tab hands it back. The stored copy is restored only into an empty composer
// and only once per conversation, so clearing the input by hand stays cleared.
function useComposerDraft(convId: string | null) {
  const aui = useAui();
  const text = useAuiState((s) => s.composer.text);
  const settingsQuery = useChatSettingsQuery(convId ?? undefined);
  const loaded = settingsQuery.data !== undefined;
  const stored = settingsQuery.data?.draft ?? null;
  const restoredFor = useRef<string | null>(null);
  const lastSaved = useRef<string | null>(null);
  useEffect(() => {
    if (!convId || !loaded || restoredFor.current === convId) return;
    restoredFor.current = convId;
    lastSaved.current = stored;
    if (stored && text === "") aui.composer().setText(stored);
  }, [aui, convId, loaded, stored, text]);
  useEffect(() => {
    if (!convId || restoredFor.current !== convId) return;
    const next = text || null;
    if (next === lastSaved.current) return;
    const timer = setTimeout(() => {
      lastSaved.current = next;
      void updateLocalConversationSettings({ convId, draft: next });
    }, 300);
    return () => clearTimeout(timer);
  }, [convId, text]);
}

const Composer: FC = () => {
  const t = useTranslations();
  const isMobile = useIsMobile();
  const convId = useAuiState((s) => s.threadListItem?.remoteId);
  useComposerDraft(convId ?? null);
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
            // maxRows bounds react-textarea-autosize's INLINE height. A CSS-only
            // max-height (max-h-32) left the lib believing the textarea was as
            // tall as the full content, which desynced iOS Safari caret
            // hit-testing (tap mid-text, caret shown there but typing inserted
            // at the end). overflow-y-auto scrolls within the bound.
            className="aui-composer-input placeholder:text-muted-foreground/80 min-h-10 w-full resize-none overflow-y-auto bg-transparent px-1.75 py-1 text-base outline-none sm:text-sm"
            rows={1}
            maxRows={6}
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
  const hydrated = useHydrated();
  const authQuery = useAuthQuery();
  const [webSearch, setWebSearch] = useAtom(chatWebSearchAtom);
  // Auth-gated: the streamed auth data can be present on the server but not yet in the client query
  // cache during the hydration render (or vice versa), mismatching this subtree. Render nothing until
  // hydration so server + first client paint agree; the toggle pops in right after for logged-in users.
  if (!hydrated || !authQuery.data) return null;
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

const ComposerContinueButton: FC = () => {
  const t = useTranslations();
  const threadRuntime = useAui().thread;
  const hasMessages = useAuiState((s) => s.thread.messages.length > 0);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  if (!hasMessages || isRunning) return null;
  return (
    <TooltipIconButton
      tooltip={t("CHAT.ACTION.CONTINUE_SCENE")}
      variant="ghost"
      className="aui-composer-continue size-8 rounded-full"
      onClick={async () => {
        const presetId = chatStore.get(chatLoadoutAtom).presetId;
        const custom = presetId
          ? await readLocalPreset(presetId)
              .then((p) => p?.continuePrompt?.trim())
              .catch(() => null)
          : null;
        threadRuntime.append(custom || CONTINUE_PROMPT);
      }}
    >
      <Icon name="chevrons-right" className="size-4" />
    </TooltipIconButton>
  );
};

// A browser that refuses storage cannot keep a single message, and every action
// fails with a generic error that reads like our bug. Name the real cause.
const StorageBlockedNotice: FC = () => {
  const t = useTranslations();
  const blocked = useStorageBlocked();
  if (!blocked) return null;
  return (
    <div className="border-destructive/40 bg-destructive/10 text-foreground flex max-w-md items-start gap-2 rounded-lg border px-3 py-2 text-xs">
      <Icon
        name="triangle-alert"
        className="text-destructive mt-0.5 size-3.5 shrink-0"
      />
      <span>{t("CHAT.STORAGE_BLOCKED")}</span>
    </div>
  );
};

const CONTINUE_PROMPT = "(OOC: Continue.)";

// Writes into the composer and never into history, so the draft stays the
// user's to edit or discard. An empty composer asks for a fresh message; a
// non-empty one rewrites what is already there rather than replacing it blind,
// because losing a half-written draft to a misfire is the loudest complaint
// about the equivalent feature elsewhere.
const ComposerImpersonateButton: FC = () => {
  const t = useTranslations();
  const aui = useAui();
  const convId = useAuiState((s) => s.threadListItem?.remoteId);
  const draft = useAuiState((s) => s.composer.text);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const [busy, setBusy] = useState(false);
  // Shown without a conversation too: a blank new chat is exactly when a blank
  // page is hardest to start.
  if (isRunning) return null;
  const enhancing = draft.trim().length > 0;
  return (
    <TooltipIconButton
      tooltip={t(
        enhancing
          ? "CHAT.ACTION.IMPERSONATE_ENHANCE"
          : "CHAT.ACTION.IMPERSONATE",
      )}
      variant="ghost"
      className={`aui-composer-impersonate h-8 rounded-full ${busy ? "w-auto px-2.5" : "w-8"}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const { runImpersonate } =
            await import("@/components/pages/sidebar/chat/runtime/impersonate-run");
          aui.composer().setText(await runImpersonate(convId ?? null, draft));
        } catch (e) {
          const { SpokeAsCharacterError } =
            await import("@/components/pages/sidebar/chat/runtime/impersonate-run");
          toast.error(
            e instanceof SpokeAsCharacterError
              ? t("CHAT.ACTION.IMPERSONATE_AS_CHAR")
              : t("ERRORS.REQUEST_FAILED"),
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <Icon
        name={busy ? "loader-circle" : "sparkles"}
        className={`size-4 ${busy ? "animate-spin" : ""}`}
      />
      {busy && (
        <span className="text-muted-foreground ml-1.5 text-xs">
          {t("CHAT.ACTION.IMPERSONATE_WORKING")}
        </span>
      )}
    </TooltipIconButton>
  );
};

const ComposerAction: FC = () => {
  const t = useTranslations();
  const threadRuntime = useAui().thread;
  const composerEmpty = useAuiState((s) => s.composer.text.trim().length === 0);
  const lastIsUser = useAuiState(
    (s) => s.thread.messages.at(-1)?.role === "user",
  );
  const emptySend = composerEmpty && lastIsUser;
  const runFromTip = () => {
    const tip = threadRuntime.getState().messages.at(-1);
    if (tip) threadRuntime.startRun({ parentId: tip.id });
  };
  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between">
      <div className="flex items-center">
        <ComposerAddAttachment />
        <ComposerWebSearchToggle />
        <ComposerContinueButton />
        <ComposerImpersonateButton />
      </div>
      <AuiIf condition={(s) => !s.thread.isRunning}>
        {emptySend ? (
          <TooltipIconButton
            tooltip={t("CHAT.ACTION.SEND")}
            side="bottom"
            variant="default"
            className="aui-composer-send size-8 rounded-full"
            aria-label={t("CHAT.ACTION.SEND")}
            onClick={runFromTip}
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

type StreamErrorDetail = {
  message: string;
  status?: number | null;
  code?: string | null;
  requestId?: string | null;
};

// The live-stream error reaches the card as the JSON envelope streamErrorText
// serialized (message + status + code + requestId, the real upstream body dug
// out of APICallError.responseBody). Parse it back to the full detail so the
// live card shows the same fields as the persisted card. Falls back to the bare
// message for legacy {message} envelopes and plain strings.
function parseStreamErrorEnvelope(raw: string): StreamErrorDetail {
  if (raw.startsWith("{")) {
    try {
      const parsed: Record<string, unknown> = JSON.parse(raw);
      const m = parsed.message;
      if (typeof m === "string") {
        return {
          message: m,
          status: typeof parsed.status === "number" ? parsed.status : null,
          code: typeof parsed.code === "string" ? parsed.code : null,
          requestId:
            typeof parsed.requestId === "string" ? parsed.requestId : null,
        };
      }
    } catch {}
  }
  return { message: raw };
}

const ErrorCard: FC<{
  message: string;
  model?: string;
  code?: string | null;
  status?: number | null;
  requestId?: string | null;
}> = (props) => {
  const t = useTranslations();
  const displayModel =
    props.model && isCustomModelId(props.model)
      ? (parseCustomModelId(props.model)?.modelKey ?? props.model)
      : props.model;
  const meta = [
    props.status ? `HTTP ${props.status}` : null,
    props.code ?? null,
    props.requestId ? `#${props.requestId}` : null,
  ].filter(Boolean);
  const copyText = [
    props.model ? `model: ${props.model}` : null,
    props.status ? `status: ${props.status}` : null,
    props.code ? `code: ${props.code}` : null,
    props.requestId ? `request id: ${props.requestId}` : null,
    `message: ${props.message}`,
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <div
      role="alert"
      className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="aui-message-error-message">
          {displayModel ? `${displayModel}: ${props.message}` : props.message}
        </span>
        <TooltipIconButton
          tooltip={t("CHAT.ACTION.COPY")}
          className="-mt-1 -mr-1 h-6 w-6 shrink-0"
          onClick={() => {
            copyToClipboard(copyText);
            toast.success(t("CHAT.SUCCESS.ERROR_COPIED"));
          }}
        >
          <Icon name="copy" className="h-3.5 w-3.5" />
        </TooltipIconButton>
      </div>
      {meta.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[11px] opacity-70">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      )}
    </div>
  );
};

const PersistedErrorPart: FC<{
  data?: {
    message?: string;
    model?: string;
    code?: string;
    status?: number;
    requestId?: string;
  };
}> = (props) => {
  const data = props.data ?? {};
  if (!data.message) return null;
  return (
    <ErrorCard
      message={data.message}
      model={data.model}
      code={data.code}
      status={data.status}
      requestId={data.requestId}
    />
  );
};

const MessageErrorBody: FC = () => {
  const error = useMessageError();
  const t = useTranslations() as unknown as LooseT;
  if (error === undefined) return null;
  const detail =
    typeof error === "string"
      ? parseStreamErrorEnvelope(error)
      : extractErrorDetail(error);
  const message = t.has(detail.message) ? t(detail.message) : detail.message;
  return (
    <ErrorCard
      message={message}
      code={detail.code}
      status={detail.status}
      requestId={detail.requestId}
    />
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
  const pricing = usePricingCatalogQuery();

  useEffect(() => {
    if (!isStreaming) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 50);
    return () => clearInterval(id);
  }, [isStreaming]);

  if (!isStreaming) return null;

  const modelType = pricing.data?.models.find(
    (m) => m.model_name === activeModel,
  )?.type;
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

const HideReasoning: FC = () => null;

const AssistantMessage: FC = () => {
  const [editing, setEditing] = useState(false);
  const showReasoning = useStreamFlag("showReasoning");
  // Read here, handed to the boundary as a thunk it calls ONLY on a crash.
  const messageContent = useAuiState((s) => s.message.content);
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
            {/* Same bubble as the user turn, so a reply reads as its own block
                rather than as loose text under the previous one. Header and
                footer stay outside it, matching the user side. */}
            <div className="aui-assistant-message-content bg-muted text-foreground mx-2 rounded-2xl px-4 py-2.5 leading-relaxed wrap-break-word empty:hidden">
              <StreamingIndicator />
              {/* Per MESSAGE, not per thread: a reply whose markdown throws
                  used to unmount the whole thread through the outer boundary,
                  so the conversation stayed blank on every later visit and the
                  user lost every other message with it. */}
              <SectionBoundary
                source="chat.message_parts"
                detail={() =>
                  messageContent
                    .map((p) =>
                      p.type === "text" || p.type === "reasoning"
                        ? `[${p.type}]\n${p.text}`
                        : `[${p.type}]`,
                    )
                    .join("\n\n")
                }
              >
                <MessagePrimitive.Parts
                  components={{
                    Text: MarkdownText,
                    Reasoning: showReasoning ? Reasoning : HideReasoning,
                    ReasoningGroup: showReasoning
                      ? ReasoningGroup
                      : HideReasoning,
                    tools: {
                      Fallback: ToolFallback,
                    },
                    data: {
                      by_name: { task: () => null, error: PersistedErrorPart },
                    },
                  }}
                />
              </SectionBoundary>
              <TaskCardRenderer />
              <MessageError />
            </div>

            <div className="aui-assistant-message-footer mt-1 ml-4 flex min-h-6 flex-wrap items-center gap-y-1">
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
  const setEditing = useSetAtom(messageEditingAtom);
  useEffect(() => {
    setEditing(true);
    return () => setEditing(false);
  }, [setEditing]);
  const messageId = useAuiState((s) => s.message.id);
  const initialText = useAuiState((s) => {
    const parts = s.message.content;
    return parts
      .flatMap((p) => (p.type === "text" ? [p.text] : []))
      .join("\n\n");
  });
  const renderedParts = useAuiState((s) => s.message.content);
  const threadMessage = useAuiState((s) => s.message);
  const [text, setText] = useState(initialText);
  const editMut = useEditMessageMutation();

  const handleSave = async () => {
    const convId = chatStore.get(convIdAtom);
    if (!convId) return;

    // Prefer the RAW useChat parts (getExternalStoreMessages is the accessor the
    // AI-SDK runtime itself uses): writing aui-CONVERTED shapes back into ai-sdk
    // state corrupts non-text parts (file/task/error) on the next render.
    const rawParts = getExternalStoreMessages<{
      parts?: Array<{ type: string; [k: string]: unknown }>;
    }>(threadMessage)[0]?.parts;
    const liveParts = rawParts ?? renderedParts ?? [];
    const newParts: Array<{ type: string; [k: string]: unknown }> = [];
    let textInjected = false;
    for (const p of liveParts) {
      if (p.type === "text") {
        if (!textInjected) {
          newParts.push({ type: "text", text });
          textInjected = true;
        }
      } else if (p.type !== "data-error") {
        // Rewriting the text is how a user repairs a failed generation; keeping
        // the error marker would leave the turn excluded from every later request.
        newParts.push(p);
      }
    }
    if (!textInjected) newParts.push({ type: "text", text });

    const items = partsToItems(newParts);

    // The mutation's onError already toasts; catch here so a rejected
    // mutateAsync (e.g. the message vanished from the local DB, a swipe/branch
    // race) does not escape this handler as an unhandled rejection.
    try {
      await editMut.mutateAsync({
        convId,
        msgId: messageId,
        body: { items },
      });
    } catch {
      return;
    }
    analytics.chat.messageEdited({ role: "assistant", is_rp: isRpActive() });

    // Instant visual update, then the DB-derived rebuild as the authority: the
    // transport sends the live array as the model's history, so a lost patch
    // here meant the model kept answering the pre-edit prompt. The rebuild is
    // best-effort: the write already landed, and a reader that throws (SQLocal
    // contention on iOS) must not strand the editor open over an applied edit.
    replaceMessageParts(messageId, () => newParts);
    try {
      await reloadLiveThreadFromDb(convId);
    } catch {
      // The patch above already reflects the edit on screen.
    }

    props.onClose();
  };

  return (
    <div className="aui-assistant-edit-in-place flex flex-col gap-2 px-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(20, Math.max(4, text.split("\n").length + 1))}
        autoFocus
        className="max-h-[40dvh] overflow-y-auto font-sans text-sm"
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
  const meta = useMessageMeta();

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

const ModelLabel: FC = () => {
  const meta = useMessageMeta();
  const pricingQuery = usePricingCatalogQuery();
  const customProvidersQuery = useCustomProvidersQuery();

  if (!meta?.model) return null;

  if (isCustomModelId(meta.model)) {
    const parsed = parseCustomModelId(meta.model);
    const provider = parsed
      ? customProvidersQuery.data?.find((p) => p.id === parsed.providerId)
      : undefined;
    const label =
      provider?.models.find((m) => m.key === parsed?.modelKey)?.label ??
      parsed?.modelKey ??
      meta.model;
    return (
      <span className="flex items-center gap-1.5">
        <Icon name="server" className="size-3" />
        <span className="opacity-70">
          {provider ? `${provider.name} / ${label}` : label}
        </span>
      </span>
    );
  }

  const modelData = pricingQuery.data?.models.find(
    (m) => m.model_name === meta.model,
  );
  const vendorName = modelData?.vendor ?? "";

  return (
    <span className="flex items-center gap-1.5">
      {vendorName && <VendorIcon vendor={vendorName} size={12} />}
      <span className="opacity-70">{meta.model}</span>
    </span>
  );
};

const AssistantMessageHeader: FC = () => {
  const speakingCharacter = useSpeakingCharacter();
  const lorebookSpeaker = useLorebookSpeaker();
  const character = speakingCharacter ?? lorebookSpeaker;
  const meta = useMessageMeta();

  // A streaming reply has no persisted row yet, so the model label is absent
  // while the character is already known.
  if (!character && !meta?.model) return null;

  return (
    <div className="text-muted-foreground mb-1 ml-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
      {character ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <RpAvatar
            mediaId={character.avatarMediaId}
            name={character.name}
            className="size-(--chat-avatar-sm)"
          />
          <span className="text-foreground truncate font-medium">
            {character.name}
          </span>
        </span>
      ) : null}
      <ModelLabel />
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

    deleteMut.mutate({ convId, msgId: messageId });
  };

  return (
    <TooltipIconButton
      tooltip={t("CHAT.ACTION.DELETE")}
      onClick={handleClick}
      className={cn(
        armed &&
          "bg-destructive/15 text-destructive hover:bg-destructive/25 hover:text-destructive",
      )}
    >
      <Icon name="trash-2" />
    </TooltipIconButton>
  );
};

const MEDIA_OUTPUT_RE = /^!\[(?:audio|image|video)\]\(/;

const isRpActive = () => chatStore.get(chatLoadoutAtom).characterIds.length > 0;

const BranchButton: FC = () => {
  const t = useTranslations();
  const messageId = useAuiState((s) => s.message.id);
  const aui = useAui();
  const forkMut = useForkConversationMutation();

  const handleClick = async () => {
    const convId = chatStore.get(convIdAtom);
    if (!convId || forkMut.isPending) return;
    try {
      const res = await forkMut.mutateAsync({ convId, messageId });
      analytics.chat.conversationBranched({ is_rp: isRpActive() });
      aui.threads().switchToThread(res.id);
      toast.success(t("CHAT.SUCCESS.BRANCHED"));
    } catch {
      toast.error(t("CHAT.SUCCESS.BRANCH_FAILED"));
    }
  };

  return (
    <TooltipIconButton
      tooltip={t("CHAT.ACTION.BRANCH")}
      onClick={handleClick}
      disabled={forkMut.isPending}
    >
      <Icon name="git-branch" />
    </TooltipIconButton>
  );
};

const AssistantActionBar: FC = () => {
  const t = useTranslations();
  const beginEdit = useContext(AssistantEditContext);
  const isMobile = useIsMobile();
  const messageId = useAuiState((s) => s.message.id);
  const isMediaOutput = useAuiState((s) => {
    const parts = s.message.content;
    const text = parts
      .flatMap((p) => (p.type === "text" ? [p.text] : []))
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
        <TooltipIconButton
          tooltip={t("CHAT.ACTION.REFRESH")}
          onClick={() =>
            analytics.chat.messageRegenerated({ is_rp: isRpActive() })
          }
        >
          <Icon name="refresh-cw" />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <BranchButton />
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

// The persona is the user's own face in an RP, so it belongs on their turns the
// way a character avatar belongs on the reply. Null whenever no persona is
// bound, which is the ordinary non-RP case.
const UserPersonaAvatar: FC = () => {
  const convId = useAuiState((s) => s.threadListItem?.remoteId);
  const settings = useChatSettingsQuery(convId ?? undefined).data;
  const personas = usePersonasQuery().data;
  const personaId =
    settings?.personaId && settings.personaId !== NONE_VALUE
      ? settings.personaId
      : null;
  const persona = personas?.find((p) => p.id === personaId);
  if (!persona) return null;
  const name = persona.title || persona.name;
  return (
    // Avatar first, like the assistant header: mirroring the order instead
    // reads as a different component rather than the same one on the other side.
    <div className="text-muted-foreground col-span-full col-start-1 row-start-1 mr-4 mb-1 flex items-center justify-end gap-1.5 text-[11px]">
      <RpAvatar
        mediaId={persona.avatarMediaId}
        name={name}
        className="size-(--chat-avatar-sm)"
      />
      <span className="text-foreground truncate font-medium">{name}</span>
    </div>
  );
};

const UserMessage: FC = () => {
  const [editing, setEditing] = useState(false);
  return (
    <AssistantEditContext.Provider value={() => setEditing(true)}>
      <MessagePrimitive.Root
        className="aui-user-message-root fade-in slide-in-from-bottom-1 animate-in mx-auto grid w-full max-w-(--thread-max-width) auto-rows-auto grid-cols-[minmax(72px,1fr)_minmax(0,auto)] content-start gap-y-2 px-2 py-3 duration-150 [&:where(>*)]:col-start-2"
        data-role="user"
      >
        {editing ? (
          <div className="col-start-2">
            <AssistantEditInPlace onClose={() => setEditing(false)} />
          </div>
        ) : (
          <>
            <UserPersonaAvatar />
            <UserMessageAttachments />

            <div className="aui-user-message-content peer bg-muted text-foreground col-start-2 row-start-3 max-w-full rounded-2xl px-4 py-2.5 wrap-break-word empty:hidden">
              <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
            </div>

            <div className="aui-user-message-footer col-span-full col-start-1 row-start-4 flex min-h-6 items-center justify-end gap-2 peer-empty:hidden">
              <UserActionBar />
              <BranchPicker className="aui-user-branch-picker -mr-1" />
            </div>
          </>
        )}
      </MessagePrimitive.Root>
    </AssistantEditContext.Provider>
  );
};

const UserActionBar: FC = () => {
  const t = useTranslations();
  const beginEdit = useContext(AssistantEditContext);
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide={useIsMobile() ? undefined : "not-last"}
      className="aui-user-action-bar-root text-muted-foreground flex gap-1"
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
      {beginEdit && (
        <TooltipIconButton tooltip={t("CHAT.ACTION.EDIT")} onClick={beginEdit}>
          <Icon name="pencil" />
        </TooltipIconButton>
      )}
      <DeleteMessageButton />
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  const t = useTranslations();
  const isMobile = useIsMobile();
  const setEditing = useSetAtom(messageEditingAtom);
  useEffect(() => {
    setEditing(true);
    return () => setEditing(false);
  }, [setEditing]);
  return (
    <MessagePrimitive.Root className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
      <ComposerPrimitive.Root className="aui-edit-composer-root bg-muted ml-auto flex w-full max-w-[85%] flex-col rounded-2xl">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input text-foreground max-h-[40dvh] min-h-14 w-full resize-none overflow-y-auto bg-transparent p-4 text-base outline-none sm:text-sm"
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
        <TooltipIconButton
          tooltip={t("CHAT.ACTION.PREVIOUS")}
          onClick={() =>
            analytics.chat.messageSwiped({
              direction: "prev",
              is_rp: isRpActive(),
            })
          }
        >
          <Icon name="chevron-left" />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton
          tooltip={t("CHAT.ACTION.NEXT")}
          onClick={() =>
            analytics.chat.messageSwiped({
              direction: "next",
              is_rp: isRpActive(),
            })
          }
        >
          <Icon name="chevron-right" />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
