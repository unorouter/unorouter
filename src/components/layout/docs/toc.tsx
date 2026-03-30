"use client";

import { cn } from "@/lib/utils";
import {
  AnchorProvider,
  ScrollProvider,
  TOCItem,
  useActiveAnchors,
} from "fumadocs-core/toc";
import type { TOCItemType } from "fumadocs-core/toc";
import { atom, useAtom, useSetAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import type { TOCState } from "./toc-utils";

export { createTOC, type TOCState } from "./toc-utils";

const INITIAL_TOC_STATE: TOCState = {
  items: [],
  title: "On this page",
};

const tocAtom = atom<TOCState>(INITIAL_TOC_STATE);

// Clerk-style offset helpers
function getItemOffset(depth: number): number {
  if (depth <= 2) return 14;
  if (depth === 3) return 26;
  return 36;
}

function getLineOffset(depth: number): number {
  return depth >= 3 ? 10 : 0;
}

// Animated thumb that tracks the active anchor position
function TocThumb(props: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const thumbRef = useRef<HTMLDivElement>(null);
  const active = useActiveAnchors();

  useEffect(() => {
    const container = props.containerRef.current;
    const thumb = thumbRef.current;
    if (!container || !thumb) return;

    function update() {
      if (!container || !thumb || active.length === 0) {
        if (thumb) {
          thumb.style.setProperty("--fd-top", "0px");
          thumb.style.setProperty("--fd-height", "0px");
        }
        return;
      }

      let upper = Number.MAX_VALUE;
      let lower = 0;

      for (const item of active) {
        const element = container.querySelector<HTMLElement>(
          `a[href="#${item}"]`,
        );
        if (!element) continue;
        const styles = getComputedStyle(element);
        upper = Math.min(
          upper,
          element.offsetTop + parseFloat(styles.paddingTop),
        );
        lower = Math.max(
          lower,
          element.offsetTop +
            element.clientHeight -
            parseFloat(styles.paddingBottom),
        );
      }

      if (upper === Number.MAX_VALUE) return;
      thumb.style.setProperty("--fd-top", `${upper}px`);
      thumb.style.setProperty("--fd-height", `${lower - upper}px`);
    }

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [active, props.containerRef]);

  return <div ref={thumbRef} role="none" className={props.className} />;
}

// Single TOC item with connector lines
function ClerkTOCItem(props: {
  item: TOCItemType;
  upper: number;
  lower: number;
}) {
  const { item, upper, lower } = props;
  const offset = getLineOffset(item.depth);
  const upperOffset = getLineOffset(upper);
  const lowerOffset = getLineOffset(lower);

  return (
    <TOCItem
      href={item.url}
      style={{ paddingInlineStart: getItemOffset(item.depth) }}
      className={cn(
        "relative py-1.5 text-sm wrap-anywhere transition-colors",
        "text-muted-foreground hover:text-accent-foreground",
        "first:pt-0 last:pb-0",
        "data-[active=true]:text-primary",
      )}
    >
      {/* Angled connector when depth changes from parent */}
      {offset !== upperOffset ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          className="absolute inset-s-0 -top-1.5 size-4 rtl:-scale-x-100"
        >
          <line
            x1={upperOffset}
            y1="0"
            x2={offset}
            y2="12"
            className="stroke-foreground/10"
            strokeWidth="1"
          />
        </svg>
      ) : null}
      {/* Vertical connector line */}
      <div
        className={cn(
          "bg-foreground/10 absolute inset-y-0 w-px",
          offset !== upperOffset && "top-1.5",
          offset !== lowerOffset && "bottom-1.5",
        )}
        style={{ insetInlineStart: offset }}
      />
      {item.title}
    </TOCItem>
  );
}

function TOCPanel(props: { className?: string }) {
  const [{ items, title }] = useAtom(tocAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<{
    path: string;
    width: number;
    height: number;
  }>();

  // Build SVG path for tree connector lines
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onResize() {
      if (!container || container.clientHeight === 0) return;

      let w = 0;
      let h = 0;
      const d: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const element = container.querySelector<HTMLElement>(
          `a[href="#${items[i].url.slice(1)}"]`,
        );
        if (!element) continue;

        const styles = getComputedStyle(element);
        const offset = getLineOffset(items[i].depth) + 1;
        const top = element.offsetTop + parseFloat(styles.paddingTop);
        const bottom =
          element.offsetTop +
          element.clientHeight -
          parseFloat(styles.paddingBottom);

        w = Math.max(offset, w);
        h = Math.max(h, bottom);

        d.push(`${i === 0 ? "M" : "L"}${offset} ${top}`);
        d.push(`L${offset} ${bottom}`);
      }

      setSvg({
        path: d.join(" "),
        width: w + 1,
        height: h,
      });
    }

    const observer = new ResizeObserver(onResize);
    onResize();
    observer.observe(container);
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <aside
      className={cn(
        "sticky top-16 hidden h-fit max-h-[calc(100svh-6rem)] w-56 shrink-0 overflow-hidden lg:block",
        "animate-in fade-in duration-150",
        props.className,
      )}
    >
      <AnchorProvider toc={items}>
        <div className="no-scrollbar flex flex-col overflow-auto">
          <h3 className="text-muted-foreground mb-2 text-xs font-semibold">
            {title}
          </h3>
          <ScrollProvider containerRef={containerRef}>
            <nav className="relative">
              {/* SVG mask + animated thumb for active indicator */}
              {svg ? (
                <div
                  className="absolute inset-s-0 top-0 rtl:-scale-x-100"
                  style={{
                    width: svg.width,
                    height: svg.height,
                    maskImage: `url("data:image/svg+xml,${encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svg.width} ${svg.height}"><path d="${svg.path}" stroke="black" stroke-width="1" fill="none" /></svg>`,
                    )}")`,
                  }}
                >
                  <TocThumb
                    containerRef={containerRef}
                    className="bg-primary mt-(--fd-top) h-(--fd-height) transition-all"
                  />
                </div>
              ) : null}
              {/* TOC items */}
              <div ref={containerRef} className="flex flex-col">
                {items.map((item, i) => (
                  <ClerkTOCItem
                    key={item.url}
                    item={item}
                    upper={items[i - 1]?.depth ?? item.depth}
                    lower={items[i + 1]?.depth ?? item.depth}
                  />
                ))}
              </div>
            </nav>
          </ScrollProvider>
        </div>
      </AnchorProvider>
    </aside>
  );
}

interface TOCLayoutProps {
  children: React.ReactNode;
  toc: TOCState;
}

export function TOCLayout(props: TOCLayoutProps) {
  useHydrateAtoms([[tocAtom, props.toc]]);
  const setToc = useSetAtom(tocAtom);

  useEffect(() => {
    setToc(props.toc);
  }, [props.toc, setToc]);

  return (
    <>
      <main className="min-w-0 flex-1">{props.children}</main>
      <TOCPanel className="mt-4 mr-4" />
    </>
  );
}
