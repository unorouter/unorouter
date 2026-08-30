"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
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
  // Scroll follow is about a box that is STREAMING and OPEN, whichever way it got
  // opened. Gating it on auto-mode only left anyone who clicked the box open with
  // no follow logic at all: no listener, no observer, just the browser shoving the
  // view as the content grows.
  const isStreamingOpen = streaming === true && isOpen;

  const prevStreamingRef = useRef(streaming);
  useLayoutEffect(() => {
    if (prevStreamingRef.current === streaming) return;
    prevStreamingRef.current = streaming;
    if (!isControlled && userOpen === null) lockScroll();
  }, [streaming, isControlled, userOpen, lockScroll]);

  // NO scroll lock on collapse. Native scroll anchoring (overflow-anchor is
  // auto on the viewport) already keeps the reading position while the box
  // shrinks; the lock fights it by forcing the pre-collapse scrollTop back,
  // and near the bottom that value exceeds the new maximum, so the browser
  // clamps to the end - which the viewport's at-bottom detector reads as the
  // user scrolling down, re-arming the follow pin and making the stream yank
  // the view again. Expanding keeps the lock: the old position stays valid
  // when content grows, so restoring it is harmless there.
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
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
  active?: boolean;
}) {
  const t = useTranslations();
  return (
    <CollapsibleTrigger
      data-slot="reasoning-trigger"
      className={cn(
        "aui-reasoning-trigger group/trigger text-muted-foreground hover:text-foreground flex max-w-[75%] items-center gap-2 py-1 text-sm transition-colors",
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
    // Follow the newest token only while the reader sits at the bottom - the
    // same contract as the thread. Once they scroll up to read mid-stream the
    // pin disengages; scrolling back to the bottom re-engages it.
    //
    // The at-bottom test must IGNORE the scrolls this effect causes itself.
    // `pin` sets scrollTop past the end and the browser clamps it, so the
    // resulting event always measures as at-bottom; re-deriving `follow` from
    // that re-armed the pin one frame after the reader scrolled away, and any
    // nudge downward stuck it back on for good.
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

  return (
    <ReasoningRoot streaming={isReasoningStreaming}>
      <ReasoningTrigger active={isReasoningStreaming} />
      <ReasoningContent aria-busy={isReasoningStreaming}>
        <ReasoningText>{children}</ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  );
};

export { Reasoning, ReasoningGroup };
