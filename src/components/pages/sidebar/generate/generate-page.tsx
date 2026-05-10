"use client";

import { GenerateForm } from "@/components/pages/sidebar/generate/generate-form";
import { GenerateResult } from "@/components/pages/sidebar/generate/generate-result";
import { RecentStrip } from "@/components/pages/sidebar/generate/recent-strip";
import { activeGenerationIdAtom } from "@/store/generation-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

// Unified generate page: form on the left, active result (or placeholder) on
// the right. /generate shows the placeholder; /generate/<id> seeds the
// activeGenerationIdAtom from the route, then the form's submit handler
// updates the same atom so the result column re-renders without remounting
// the form.
//
// Mirrors the chat layout's split-pane shape: history rail in app sidebar,
// composer + viewer side by side in the main column.
export function GeneratePage(props: { generationId?: string }) {
  const t = useTranslations();
  const [activeId, setActiveId] = useAtom(activeGenerationIdAtom);

  // Seed atom from the route. Two cases:
  // 1. Direct nav to /generate/<id> -> sync atom to that id.
  // 2. Nav to /generate (no id)     -> clear atom so the placeholder shows.
  useEffect(() => {
    setActiveId(props.generationId ?? null);
  }, [props.generationId, setActiveId]);

  return (
    // Single scroller on mobile (form stacked over result), split into two
    // independent scroll columns on desktop. The split layout matches chat;
    // the stacked layout keeps the result visible on phones where the form
    // alone would otherwise fill the viewport.
    <div className="thin-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6 lg:flex-row lg:overflow-hidden">
      {/* Form column. */}
      <div className="thin-scrollbar flex-1 lg:overflow-y-auto lg:pr-2">
        <div className="max-w-2xl">
          <GenerateForm />
        </div>
      </div>

      {/* Result column. RecentStrip below renders a horizontal strip of
          last-N generations so users can flip between them without going
          to the sidebar list. */}
      <div className="thin-scrollbar flex flex-1 flex-col gap-6 lg:overflow-y-auto lg:pl-2">
        {activeId ? (
          <GenerateResult generationId={activeId} />
        ) : (
          <div className="text-muted-foreground hidden h-full items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm lg:flex">
            {t("IMAGE.PICK_OR_GENERATE")}
          </div>
        )}
        <RecentStrip />
      </div>
    </div>
  );
}
