import type { TOCItemType } from "fumadocs-core/toc";

export type TOCState = {
  items: TOCItemType[];
  title: string;
};

export function createTOC(
  items: TOCItemType[],
  title: string = "On this page",
): TOCState {
  return { items, title };
}
