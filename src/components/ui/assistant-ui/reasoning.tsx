"use client";

import dynamic from "next/dynamic";
// Markdown pipeline (~75KB gzip) loads with the first rendered message, not
// with the empty-thread shell.
const MarkdownText = dynamic(
  () =>
    import("@/components/ui/assistant-ui/markdown-text").then(
      (m) => m.MarkdownText,
    ),
  { ssr: false },
  // The message-part slot type carries part props MarkdownText ignores
  // (it reads message context); restore the original signature.
) as unknown as typeof import("@/components/ui/assistant-ui/markdown-text").MarkdownText;
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
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const ANIMATION_DURATION = 200;

function ReasoningRoot({
  className,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Collapsible>, "open" | "onOpenChange"> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      lockScroll();
    }
    if (!isControlled) {
      setUncontrolledOpen(open);
    }
    controlledOnOpenChange?.(open);
  };

  return (
    <Collapsible
      ref={collapsibleRef}
      data-slot="reasoning-root"
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(
        "group/reasoning-root aui-reasoning-root mb-4 w-full rounded-lg border px-3 py-2",
        className,
      )}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
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
  following,
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent> & {
  /** While true (reasoning streaming), pin the scrollbox to the bottom. */
  following?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !following) return;
    // Release the pin when the user scrolls up; re-engage near the bottom.
    const onScroll = () => {
      stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    const target = el.firstElementChild ?? el;
    const ro = new ResizeObserver(() => {
      if (stickRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(target);
    el.scrollTop = el.scrollHeight;
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [following]);

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
      <div
        ref={scrollRef}
        className="relative z-0 max-h-64 overflow-y-auto pt-2 pb-2 pl-6 leading-relaxed"
      >
        <div>{children}</div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-[linear-gradient(to_top,var(--color-background),transparent)]" />
    </CollapsibleContent>
  );
}

const Reasoning: ReasoningMessagePartComponent = () => <MarkdownText />;

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
    <ReasoningRoot defaultOpen={isReasoningStreaming}>
      <ReasoningTrigger active={isReasoningStreaming} />
      <ReasoningContent
        aria-busy={isReasoningStreaming}
        following={isReasoningStreaming}
      >
        {children}
      </ReasoningContent>
    </ReasoningRoot>
  );
};

export { Reasoning, ReasoningGroup };
