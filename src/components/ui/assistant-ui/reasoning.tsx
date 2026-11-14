"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Icon } from "@/components/ui/icon";
import { countTokens } from "@/lib/ai/chat/tokenizer";
import { formatTokens } from "@/lib/utils/format/number";
import { cn } from "@/lib/utils";
import { showThinkingTokensAtom } from "@/store/chat-store";
import { useAtomValue } from "jotai";
import {
  useAuiState,
  useScrollLock,
  type ReasoningGroupComponent,
  type ReasoningMessagePartComponent,
} from "@assistant-ui/react";
import { cva, type VariantProps } from "class-variance-authority";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const ReasoningMarkdown = dynamic(
  () =>
    import("@/components/ui/assistant-ui/reasoning-markdown").then(
      (m) => m.ReasoningMarkdown,
    ),
  { ssr: false },
);

const ANIMATION_DURATION = 200;

// Separate from the preview flag: the fade overlay is a look for the auto-opened peek, while
// scroll follow has to run for ANY open box that is streaming.
const ReasoningStreamingOpenContext = createContext(false);

const reasoningVariants = cva("aui-reasoning-root mb-4 w-full", {
  variants: {
    variant: {
      outline: "rounded-lg border px-3 py-2",
      ghost: "",
      muted: "bg-muted/50 rounded-lg px-3 py-2",
    },
  },
  defaultVariants: {
    variant: "outline",
  },
});

export type ReasoningRootProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "onOpenChange"
> &
  VariantProps<typeof reasoningVariants> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
    streaming?: boolean;
  };

function ReasoningRoot({
  className,
  variant,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  streaming,
  children,
  ...props
}: ReasoningRootProps) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const [initialOpen] = useState(defaultOpen);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled
    ? controlledOpen
    : (userOpen ?? streaming ?? initialOpen);
  // Not gated on auto-open: a box the user clicked open must follow too.
  const isStreamingOpen = streaming === true && isOpen;

  const prevStreamingRef = useRef(streaming);
  useLayoutEffect(() => {
    if (prevStreamingRef.current === streaming) return;
    prevStreamingRef.current = streaming;
    if (!isControlled && userOpen === null) lockScroll();
  }, [streaming, isControlled, userOpen, lockScroll]);

  // No lock on collapse: scroll anchoring already holds the position, and near
  // the bottom the restored scrollTop clamps to the end, which the viewport
  // reads as the user scrolling down and re-arms the follow pin.
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) lockScroll();
      if (!isControlled) setUserOpen(open);
      controlledOnOpenChange?.(open);
    },
    [lockScroll, isControlled, controlledOnOpenChange],
  );

  return (
    <Collapsible
      ref={collapsibleRef}
      data-slot="reasoning-root"
      data-variant={variant}
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(
        "group/reasoning-root",
        reasoningVariants({ variant, className }),
      )}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
      {...props}
    >
      <ReasoningStreamingOpenContext.Provider value={isStreamingOpen}>
        {children}
      </ReasoningStreamingOpenContext.Provider>
    </Collapsible>
  );
}

function ReasoningTrigger({
  active,
  tokens,
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
  active?: boolean;
  tokens?: number;
}) {
  const t = useTranslations();
  return (
    <CollapsibleTrigger
      data-slot="reasoning-trigger"
      className={cn(
        "aui-reasoning-trigger group/trigger text-muted-foreground hover:text-foreground flex w-full items-center gap-2 py-1 text-sm transition-colors",
        className,
      )}
      {...props}
    >
      <Icon
        name="brain"
        data-slot="reasoning-trigger-icon"
        className={cn(
          "aui-reasoning-trigger-icon size-4 shrink-0",
          active && "animate-pulse",
        )}
      />
      <span
        data-slot="reasoning-trigger-label"
        className="aui-reasoning-trigger-label-wrapper relative inline-block leading-none"
      >
        <span>{t("CHAT.THINKING")}</span>
        {active ? (
          <span
            aria-hidden
            data-slot="reasoning-trigger-shimmer"
            className="aui-reasoning-trigger-shimmer shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
          >
            {t("CHAT.THINKING")}
          </span>
        ) : null}
      </span>
      <Icon
        name="chevron-down"
        data-slot="reasoning-trigger-chevron"
        className={cn(
          "aui-reasoning-trigger-chevron mt-0.5 size-4 shrink-0",
          "transition-transform duration-(--animation-duration) ease-out",
          "group-data-[state=closed]/trigger:-rotate-90",
          "group-data-[state=open]/trigger:rotate-0",
        )}
      />
      {tokens ? (
        <span
          data-slot="reasoning-trigger-tokens"
          className="aui-reasoning-trigger-tokens ml-auto shrink-0 text-xs tabular-nums"
        >
          {t("CHAT.THOUGHT_TOKENS", { count: formatTokens(tokens) })}
        </span>
      ) : null}
    </CollapsibleTrigger>
  );
}

function ReasoningContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="reasoning-content"
      className={cn(
        "aui-reasoning-content text-muted-foreground relative overflow-hidden text-sm outline-none",
        "group/collapsible-content ease-out",
        "data-[state=closed]:animate-collapsible-up",
        "data-[state=open]:animate-collapsible-down",
        "data-[state=closed]:fill-mode-forwards",
        "data-[state=closed]:pointer-events-none",
        "data-[state=open]:duration-(--animation-duration)",
        "data-[state=closed]:duration-(--animation-duration)",
        className,
      )}
      {...props}
    >
      {children}
    </CollapsibleContent>
  );
}

function ReasoningText({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const isStreamingOpen = useContext(ReasoningStreamingOpenContext);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isStreamingOpen) return;
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl) return;
    // Follows only while the reader sits at the bottom. The at-bottom test must
    // ignore this effect's own scrolls: `pin` overshoots and the clamp always
    // measures as at-bottom, which re-armed the pin after the reader left.
    let follow = true;
    let selfScrolling = false;
    const AT_BOTTOM_SLACK = 24;
    const onScroll = () => {
      if (selfScrolling) {
        selfScrolling = false;
        return;
      }
      follow =
        scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight <
        AT_BOTTOM_SLACK;
    };
    const pin = () => {
      if (!follow) return;
      const target = scrollEl.scrollHeight - scrollEl.clientHeight;
      if (Math.abs(scrollEl.scrollTop - target) < 1) return;
      selfScrolling = true;
      scrollEl.scrollTop = target;
    };
    pin();
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(pin);
    observer.observe(contentEl);
    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [isStreamingOpen]);

  return (
    <div
      ref={scrollRef}
      data-slot="reasoning-text"
      className={cn(
        "aui-reasoning-text relative z-0 max-h-64 overflow-y-auto ps-6 pt-2 pb-2 leading-relaxed",
        "transform-gpu transition-[transform,opacity]",
        "group-data-[state=open]/collapsible-content:animate-in",
        "group-data-[state=closed]/collapsible-content:animate-out",
        "group-data-[state=open]/collapsible-content:fade-in-0",
        "group-data-[state=closed]/collapsible-content:fade-out-0",
        "group-data-[state=open]/collapsible-content:slide-in-from-top-4",
        "group-data-[state=closed]/collapsible-content:slide-out-to-top-4",
        "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
        "group-data-[state=closed]/collapsible-content:duration-(--animation-duration)",
        className,
      )}
      {...props}
    >
      <div ref={contentRef} className="aui-reasoning-text-content space-y-4">
        {children}
      </div>
    </div>
  );
}

const Reasoning: ReasoningMessagePartComponent = () => <ReasoningMarkdown />;

const ReasoningGroup: ReasoningGroupComponent = ({
  children,
  startIndex,
  endIndex,
}) => {
  const isReasoningStreaming = useAuiState((s) => {
    if (s.message.status?.type !== "running") return false;
    const lastIndex = s.message.parts.length - 1;
    if (lastIndex < 0) return false;
    const lastType = s.message.parts[lastIndex]?.type;
    if (lastType !== "reasoning") return false;
    return lastIndex >= startIndex && lastIndex <= endIndex;
  });

  // Counted with the active tokenizer once the stream ends; the gateway only
  // reports reasoning inside the total output count.
  const showTokens = useAtomValue(showThinkingTokensAtom);
  const reasoningText = useAuiState((s) => {
    if (!showTokens || s.message.status?.type === "running") return "";
    return s.message.parts
      .slice(startIndex, endIndex + 1)
      .map((p) => (p.type === "reasoning" ? p.text : ""))
      .join("\n");
  });
  const tokens = reasoningText ? countTokens(reasoningText) : 0;

  return (
    <ReasoningRoot streaming={isReasoningStreaming}>
      <ReasoningTrigger active={isReasoningStreaming} tokens={tokens} />
      <ReasoningContent aria-busy={isReasoningStreaming}>
        <ReasoningText>{children}</ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  );
};

export { Reasoning, ReasoningGroup };
