"use client";

import { HoverCard } from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useStatusBlocksLabels } from "@/components/ui/status/status-i18n";
import type {
  StatusBarData,
  StatusEventType,
  StatusType,
} from "@/components/ui/status/status.types";
import { statusColors } from "@/components/ui/status/status.utils";
import { useMediaQuery } from "@/hooks/ui/use-media-query";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/utils/format/date";
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";
import { useEffect, useRef, useState } from "react";

interface StatusBarProps {
  data: StatusBarData[];
  renderCard?: (
    data: StatusBarData["card"][number],
    index: number,
  ) => React.ReactNode;
  renderBar?: (
    data: StatusBarData["bar"][number],
    index: number,
  ) => React.ReactNode;
  renderEvent?: (
    data: StatusBarData["events"][number],
    index: number,
  ) => React.ReactNode;
}

interface UseStatusBarProps {
  dataLength: number;
  isTouch: boolean;
}

type InteractionType = "pin" | "hover" | "focus" | null;

function useStatusBar({ dataLength, isTouch }: UseStatusBarProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [interactionType, setInteractionType] = useState<InteractionType>(null);
  const buttonRefs = useRef<(HTMLElement | null)[]>([]);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (interactionType !== "pin" || activeIndex === null) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setActiveIndex(null);
        setInteractionType(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [interactionType, activeIndex]);

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleClick = (index: number) => {
    clearHoverTimeout();
    setActiveIndex((prev) => {
      if (prev === index) {
        setInteractionType(null);
        return null;
      }
      setInteractionType("pin");
      return index;
    });
  };

  const handleHoverStart = (index: number) => {
    if (isTouch) return;
    clearHoverTimeout();
    setActiveIndex(index);
    setInteractionType("hover");
  };

  const handleHoverEnd = () => {
    if (interactionType !== "hover") return;
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveIndex(null);
      setInteractionType(null);
    }, 100);
  };

  const handleFocus = (index: number) => {
    setActiveIndex(index);
    setInteractionType("focus");
  };

  const handleBlur = (e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    const isMovingToAnotherBar =
      relatedTarget &&
      relatedTarget.closest('[role="toolbar"]') === containerRef.current &&
      relatedTarget.getAttribute("role") === "button";

    if (!isMovingToAnotherBar) {
      setActiveIndex(null);
      setInteractionType(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setActiveIndex(null);
        setInteractionType(null);
        clearHoverTimeout();
        buttonRefs.current[currentIndex]?.blur();
        break;

      case "ArrowLeft":
        e.preventDefault();
        {
          const newIndex = currentIndex > 0 ? currentIndex - 1 : dataLength - 1;
          buttonRefs.current[newIndex]?.focus();
        }
        break;

      case "ArrowRight":
        e.preventDefault();
        {
          const newIndex = currentIndex < dataLength - 1 ? currentIndex + 1 : 0;
          buttonRefs.current[newIndex]?.focus();
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        {
          const prevMonitor = containerRef.current?.closest(
            '[data-slot="status-component"]',
          )?.previousElementSibling;
          if (prevMonitor) {
            const prevBar = prevMonitor.querySelector('[role="toolbar"]');
            if (prevBar) {
              const prevButtons = prevBar.querySelectorAll('[role="button"]');
              const targetButton = prevButtons[currentIndex] as HTMLElement;
              targetButton?.focus();
            }
          }
        }
        break;

      case "ArrowDown":
        e.preventDefault();
        {
          const nextMonitor = containerRef.current?.closest(
            '[data-slot="status-component"]',
          )?.nextElementSibling;
          if (nextMonitor) {
            const nextBar = nextMonitor.querySelector('[role="toolbar"]');
            if (nextBar) {
              const nextButtons = nextBar.querySelectorAll('[role="button"]');
              const targetButton = nextButtons[currentIndex] as HTMLElement;
              targetButton?.focus();
            }
          }
        }
        break;

      case "Enter":
      case " ":
        e.preventDefault();
        handleClick(currentIndex);
        break;
    }
  };

  const setButtonRef = (index: number, el: HTMLElement | null) => {
    buttonRefs.current[index] = el;
  };

  return {
    activeIndex,
    isOpen: activeIndex !== null,
    interactionType,
    containerRef,
    handlers: {
      onClick: handleClick,
      onHoverStart: handleHoverStart,
      onHoverEnd: handleHoverEnd,
      onHoverCardEnter: clearHoverTimeout,
      onHoverCardLeave: () => {
        setActiveIndex(null);
        setInteractionType(null);
      },
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
    },
    setButtonRef,
  };
}

export function StatusBar({
  data,
  renderCard,
  renderBar,
  renderEvent,
}: StatusBarProps) {
  const labels = useStatusBlocksLabels();
  const isTouch = useMediaQuery("(hover: none)");
  const { activeIndex, interactionType, containerRef, handlers, setButtonRef } =
    useStatusBar({
      dataLength: data.length,
      isTouch,
    });

  const first = data[0];
  const last = data[data.length - 1];
  const activeItem = activeIndex !== null ? data[activeIndex] : null;
  const isPinned = interactionType === "pin";

  // Shared anchor: resolve to the active bar's DOM node every call so the
  // single HoverCard can re-position as activeIndex changes.
  const getAnchor = () => {
    if (activeIndex === null) return null;
    return (
      (containerRef.current?.querySelector(
        `[data-bar-index="${activeIndex}"]`,
      ) as HTMLElement | null) ?? null
    );
  };

  return (
    <div className="flex w-full flex-col gap-1.5" data-slot="status-bar-root">
      <div
        ref={containerRef}
        className="flex h-12.5 w-full items-end gap-px"
        data-slot="status-bar"
        role="toolbar"
        aria-label={labels.ariaStatusTracker}
      >
        {data.map((item, index) => {
          const isActive = activeIndex === index;
          const isLastItem = index === data.length - 1;

          if (renderBar) {
            return (
              <StatusBarBar
                key={item.day}
                index={index}
                item={item}
                isActive={isActive}
                isLastItem={isLastItem}
                isPinned={isActive && isPinned}
                handlers={handlers}
                setButtonRef={setButtonRef}
                renderBar={renderBar}
                ariaLabel={labels.ariaDayStatus(index + 1)}
              />
            );
          }
          return (
            <StatusBarBar
              key={item.day}
              index={index}
              item={item}
              isActive={isActive}
              isLastItem={isLastItem}
              isPinned={isActive && isPinned}
              handlers={handlers}
              setButtonRef={setButtonRef}
              ariaLabel={labels.ariaDayStatus(index + 1)}
            />
          );
        })}
      </div>
      {first && last && (
        <div
          className="text-muted-foreground flex w-full justify-between font-mono text-[10px] tabular-nums"
          data-slot="status-bar-axis"
        >
          <span>{labels.formatDateTime(new Date(first.day))}</span>
          <span>{labels.formatDateTime(new Date(last.day))}</span>
        </div>
      )}
      {activeItem && (
        <HoverCard open onOpenChange={() => {}}>
          <PreviewCardPrimitive.Portal>
            <PreviewCardPrimitive.Positioner
              anchor={getAnchor}
              side="top"
              sideOffset={4}
              align="center"
              alignOffset={4}
              className="isolate z-50"
            >
              <PreviewCardPrimitive.Popup
                className="bg-popover text-popover-foreground ring-foreground/10 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 w-max max-w-sm origin-(--transform-origin) rounded-lg p-0 text-sm shadow-md ring-1 outline-hidden duration-100"
                onMouseEnter={handlers.onHoverCardEnter}
                onMouseLeave={handlers.onHoverCardLeave}
              >
                <StatusBarCard
                  item={activeItem}
                  isPinned={isPinned}
                  isTouch={isTouch}
                  renderCard={renderCard}
                  renderEvent={renderEvent}
                />
              </PreviewCardPrimitive.Popup>
            </PreviewCardPrimitive.Positioner>
          </PreviewCardPrimitive.Portal>
        </HoverCard>
      )}
    </div>
  );
}
StatusBar.displayName = "StatusBar";

interface StatusBarBarProps {
  index: number;
  item: StatusBarData;
  isActive: boolean;
  isPinned: boolean;
  isLastItem: boolean;
  handlers: ReturnType<typeof useStatusBar>["handlers"];
  setButtonRef: (index: number, el: HTMLElement | null) => void;
  renderBar?: StatusBarProps["renderBar"];
  ariaLabel: string;
}

// One bar = one plain div with handlers. No HoverCard per bar (that explodes
// into thousands of Floating UI instances on a 78-row page). The parent
// StatusBar mounts a single shared HoverCard and anchors it to whichever bar
// is active.
function StatusBarBar(props: StatusBarBarProps) {
  return (
    <div
      ref={(el) => props.setButtonRef(props.index, el)}
      data-slot="status-bar-item"
      data-bar-index={props.index}
      className="group focus-visible:ring-ring/50 relative flex h-full min-w-0 flex-1 cursor-pointer flex-col rounded-full outline-none hover:opacity-80 focus-visible:opacity-80 focus-visible:ring-2 aria-pressed:opacity-80"
      role="button"
      aria-label={props.ariaLabel}
      aria-pressed={props.isPinned}
      aria-expanded={props.isActive}
      tabIndex={
        props.isLastItem && !props.isActive ? 0 : props.isActive ? 0 : -1
      }
      onClick={() => props.handlers.onClick(props.index)}
      onFocus={() => props.handlers.onFocus(props.index)}
      onBlur={props.handlers.onBlur}
      onMouseEnter={() => props.handlers.onHoverStart(props.index)}
      onMouseLeave={props.handlers.onHoverEnd}
      onKeyDown={(e) => props.handlers.onKeyDown(e, props.index)}
    >
      <div className="flex h-full w-full flex-col overflow-hidden rounded-full">
        {props.item.bar.map((segment, segmentIndex) => {
          if (props.renderBar) {
            return props.renderBar(segment, segmentIndex);
          }
          return (
            <div
              key={`${props.item.day}-${segment.status}-${segmentIndex}`}
              className={cn("w-full", {
                "rounded-t-full": segmentIndex === 0,
                "rounded-b-full": segmentIndex === props.item.bar.length - 1,
              })}
              style={{
                height: `${segment.height}%`,
                backgroundColor: statusColors[segment.status],
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

interface StatusBarCardProps {
  item: StatusBarData;
  isPinned: boolean;
  isTouch: boolean;
  renderCard?: StatusBarProps["renderCard"];
  renderEvent?: StatusBarProps["renderEvent"];
}

function StatusBarCard({
  item,
  isPinned,
  isTouch,
  renderCard,
  renderEvent,
}: StatusBarCardProps) {
  const labels = useStatusBlocksLabels();
  return (
    <div data-slot="status-bar-card">
      <div className="p-2 text-xs">
        {labels.formatDateTime(new Date(item.day))}
      </div>
      <Separator />
      <div className="space-y-1 p-2 text-sm">
        {item.card.map((cardItem, cardIndex) => {
          if (renderCard) {
            return renderCard(cardItem, cardIndex);
          }
          return (
            <StatusBarContent
              key={`${item.day}-card-${cardIndex}`}
              status={cardItem.status}
              value={cardItem.value}
            />
          );
        })}
      </div>
      {item.events.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            {item.events.map((event, eventIndex) => {
              if (renderEvent) {
                return renderEvent(event, eventIndex);
              }
              return (
                <StatusBarEvent
                  key={`${event.id}-${event.type}`}
                  type={event.type}
                  name={event.name}
                  from={event.from}
                  to={event.to}
                  isAggregated={event.isAggregated}
                />
              );
            })}
          </div>
        </>
      )}
      {isPinned && !isTouch && (
        <>
          <Separator />
          <div className="text-muted-foreground flex cursor-pointer items-center p-2 text-xs">
            <span>{labels.clickAgainToUnpin}</span>
            <kbd className="border-input bg-background text-muted-foreground ml-auto inline-flex h-5 max-h-5 min-w-5 items-center justify-center rounded border px-1.5 font-mono text-[10px] font-medium">
              Esc
            </kbd>
          </div>
        </>
      )}
    </div>
  );
}
StatusBarCard.displayName = "StatusBarCard";

export function StatusBarSkeleton({
  className,
  ...props
}: React.ComponentProps<typeof Skeleton>) {
  return (
    <Skeleton
      className={cn("bg-muted h-12.5 w-full rounded-none", className)}
      {...props}
    />
  );
}
StatusBarSkeleton.displayName = "StatusBarSkeleton";

function StatusBarContent({
  status,
  value,
}: {
  status: StatusType;
  value: string;
}) {
  const labels = useStatusBlocksLabels();
  return (
    <div className="flex items-baseline gap-4" data-slot="status-bar-content">
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-sm"
          style={{
            backgroundColor: statusColors[status],
          }}
        />
        <div className="text-sm">{labels.requestStatus[status]}</div>
      </div>
      <div className="text-muted-foreground ml-auto font-mono text-xs tracking-tight whitespace-nowrap">
        {value}
      </div>
    </div>
  );
}
StatusBarContent.displayName = "StatusBarContent";

export function StatusBarEvent({
  name,
  from,
  to,
  type,
  isAggregated,
}: {
  name: string;
  from?: Date | null;
  to?: Date | null;
  type: StatusEventType;
  isAggregated?: boolean;
}) {
  const labels = useStatusBlocksLabels();
  if (!from) return null;

  const status =
    type === "incident" ? "error" : type === "report" ? "degraded" : "info";

  return (
    <div className="group text-sm" data-slot="status-bar-event">
      <div className="text-muted-foreground hover:text-foreground flex items-start gap-2">
        <div
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{
            backgroundColor: statusColors[status],
          }}
        />
        <div>{name}</div>
      </div>
      <div className="text-muted-foreground mt-1 pl-4.5 text-xs">
        {labels.formatDateRange(from, to ?? undefined)}{" "}
        <span className="text-muted-foreground/70 ml-1.5 font-mono">
          {formatDuration({ from, to, name, type, isAggregated, labels })}
        </span>
      </div>
    </div>
  );
}
StatusBarEvent.displayName = "StatusBarEvent";

const formatDuration = ({
  from,
  to,
  isAggregated,
  labels,
}: React.ComponentProps<typeof StatusBarEvent> & {
  labels: ReturnType<typeof useStatusBlocksLabels>;
}) => {
  if (!from) return null;
  if (!to) return labels.ongoing;
  if (dayjs(to).diff(from, "second") === 0) return null;
  const duration = dayjs(to).from(from, true);
  if (isAggregated) return labels.durationAcross(duration);
  return duration;
};
