import type { Plugin } from "unified";
import type { Element, Root } from "hast";

const SKIP_TAGS = new Set(["code", "pre", "math", "mjx-container", "svg"]);

// Runs after markdown parsing, so every asterisk that formed emphasis is gone
// already; what is left is a marker the model failed to pair ("* walks *").
// One between two word characters ("2*3") is content and stays.
const STRAY_STARS = /(?<![\p{L}\p{N}])\*+|\*+(?![\p{L}\p{N}])/gu;

function strip(node: Root | Element) {
  for (const child of node.children) {
    if (child.type === "text")
      child.value = child.value.replace(STRAY_STARS, "");
    else if (child.type === "element" && !SKIP_TAGS.has(child.tagName))
      strip(child);
  }
}

// "* walks over *" is an RP action the model meant as italics; at a line start
// markdown even reads it as a list item. Tightened, it parses as emphasis.
const SPACED_PAIR =
  /(^|[ \t])\*[ \t]+([^*\n]*?[^*\s])[ \t]+\*(?=[\s.,!?;:]|$)/gm;

export const tightenSpacedStars = (text: string) =>
  text.replace(SPACED_PAIR, "$1*$2*");

export const rehypeHideStars: Plugin<[], Root> = () => (tree: Root) =>
  strip(tree);
