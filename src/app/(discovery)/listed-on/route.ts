import {
  FOOTER_BADGES,
  FOOTER_TEXT_LINKS,
} from "@/components/layout/nav/footer-badges";
import { env } from "@/lib/config/env";

export const dynamic = "force-static";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Some directory checkers refuse pages over a few hundred KB, so this page
// carries every badge and link from the footer and nothing else.
export function GET() {
  const badges = FOOTER_BADGES.map((badge) => {
    const data = Object.entries("data" in badge ? (badge.data ?? {}) : {})
      .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`)
      .join("");
    const alt =
      "alt" in badge && badge.alt ? badge.alt : `Featured on ${badge.name}`;
    return `<a href="${escapeHtml(badge.href)}" target="_blank" rel="sponsored nofollow noopener"${data}><img src="${escapeHtml(badge.src)}" alt="${escapeHtml(alt)}" width="${badge.width}" height="24" loading="lazy"></a>`;
  });
  const texts = FOOTER_TEXT_LINKS.map(
    (link) =>
      `<a href="${escapeHtml(link.href)}" target="_blank" rel="sponsored nofollow noopener">${escapeHtml(link.label)}</a>`,
  );

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(env.appName)}: listed on</title>
<meta name="description" content="Directories that list ${escapeHtml(env.appName)}, an OpenAI compatible API for every AI model.">
<link rel="canonical" href="https://unorouter.com/listed-on">
<style>body{margin:0;padding:24px;background:#0a0a0a;color:#ccc;font:14px system-ui,sans-serif}a{color:#ccc}div{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:16px 0}img{height:24px;width:auto}</style>
</head>
<body>
<h1><a href="https://unorouter.com/">${escapeHtml(env.appName)}</a>: listed on</h1>
<div>${badges.join("")}</div>
<div>${texts.join("")}</div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
