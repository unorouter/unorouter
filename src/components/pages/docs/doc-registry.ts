import type { Pathname } from "@/i18n/routing";
import type { TranslationKey } from "@/lib/config/constants";
import type { IconName } from "@/lib/config/icon-map";
import type { DocI18nPrefix } from "@/lib/types";

export type DocHeading = { id: string; i18nLeaf: string; level: 2 | 3 };

export type Doc<S extends string> = {
  slug: string;
  href: Pathname;
  i18nPrefix: DocI18nPrefix;
  section: S;
  iconName: IconName;
  headings: DocHeading[];
};

export function makeDocs<N extends string, S extends string>(
  route: "/docs/chat/[slug]" | "/docs/platform/[slug]",
  prefix: (name: N) => DocI18nPrefix,
  inputs: {
    slug: string;
    name: N;
    section: S;
    iconName: IconName;
    headings: [string, string][];
  }[],
): Doc<S>[] {
  return inputs.map((input) => ({
    slug: input.slug,
    href: { pathname: route, params: { slug: input.slug } },
    i18nPrefix: prefix(input.name),
    section: input.section,
    iconName: input.iconName,
    headings: input.headings.map(([id, leaf]) => ({
      id,
      i18nLeaf: leaf,
      level: 2,
    })),
  }));
}

export function docSections<S extends string>(
  docs: Doc<S>[],
  order: readonly S[],
  labels: Record<S, TranslationKey>,
) {
  return order
    .map((section) => ({
      labelKey: labels[section],
      docs: docs.filter((doc) => doc.section === section),
    }))
    .filter((group) => group.docs.length > 0);
}
