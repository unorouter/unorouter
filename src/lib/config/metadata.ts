import type { Metadata } from "next";
import { LOCALES } from "./constants";

type MetadataParams = {
  locale: (typeof LOCALES)[number];
  title: string;
  description: string;
};

export function getPageMetadata(params: MetadataParams): Metadata {
  return {
    title: params.title,
    description: params.description,
    openGraph: {
      title: params.title,
      description: params.description,
      locale: params.locale,
    },
  };
}
