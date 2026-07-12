"use client";

import { analytics } from "@/lib/analytics";
import { useEffect } from "react";

export function GuideViewedBeacon(props: { slug: string }) {
  const slug = props.slug;
  useEffect(() => {
    analytics.docs.guideViewed({ slug });
  }, [slug]);
  return null;
}
