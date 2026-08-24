/** @jsxImportSource @kitajs/html */
/* eslint-disable @next/next/no-head-element, @next/next/no-img-element, jsx-a11y/alt-text */

import {
  buildBadgeUrl,
  type BadgeFormat,
  type BadgeSize,
  type BadgeType,
  type BuildBadgeUrlOptions,
  type SocialSize,
} from "@/lib/validation/badge";
import { svgDataUri } from "../lib/utils";

export type PreviewType = BadgeType | "social";
export type PreviewSize = BadgeSize | SocialSize;
export interface PreviewGroup {
  type: PreviewType;
  badges: { size: PreviewSize; label: string; svg: string }[];
}

function pageUrl(
  type: PreviewType,
  size: PreviewSize,
  shared: BuildBadgeUrlOptions,
  format?: BadgeFormat,
): string {
  return buildBadgeUrl(type, { ...shared, size, format });
}

function copyScript(
  type: PreviewType,
  size: PreviewSize,
  label: string,
  shared: BuildBadgeUrlOptions,
  format: BadgeFormat,
): string {
  const path = pageUrl(type, size, shared, format);
  return [
    `navigator.clipboard.writeText(location.origin+'${path}')`,
    `.then(()=>{`,
    `let t=document.getElementById('toast');`,
    `t.textContent='Copied ${format.toUpperCase()}: ${label}';`,
    `t.classList.add('show');`,
    `setTimeout(()=>t.classList.remove('show'),1500)`,
    `})`,
  ].join("");
}

export function AllPage(props: {
  bg: string;
  fg: string;
  muted: string;
  shared: BuildBadgeUrlOptions;
  groups: PreviewGroup[];
  badgeAlt: string;
}) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Badge Preview</title>
        <style>{`
body{background:${props.bg};color:${props.fg};font-family:system-ui;padding:40px}
.group{margin-bottom:48px}
.group-title{font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${props.fg};margin:0 0 20px;padding-bottom:8px;border-bottom:1px solid ${props.muted}30}
.grid{display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start}
.badge{flex:0 0 auto}
.header{display:flex;align-items:center;gap:8px;margin:0 0 8px}
.header a{font-size:14px;color:${props.muted};text-transform:uppercase;letter-spacing:1px;text-decoration:none;transition:color 0.15s}
.header a:hover{color:${props.fg}}
.header:hover .copy{opacity:0.7}
.copy{background:none;border:1px solid ${props.muted}40;border-radius:4px;cursor:pointer;padding:2px 6px;display:inline-flex;align-items:center;color:${props.muted};opacity:0.6;transition:opacity 0.15s,color 0.15s,border-color 0.15s}
.copy:hover{opacity:1;color:${props.fg};border-color:${props.fg}60}
.copy-label{font-size:10px;font-weight:600;letter-spacing:0.5px}
.badge img.badge-img{display:block;max-width:100%;height:auto}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#22c55e;color:#000;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;opacity:0;transition:opacity 0.2s;pointer-events:none}
.toast.show{opacity:1}
        `}</style>
      </head>
      <body>
        {props.groups.map((g) => (
          <div class="group">
            <h2 class="group-title">{g.type}</h2>
            <div class="grid">
              {g.badges.map((b) => (
                <div class="badge">
                  <div class="header">
                    <a
                      href={pageUrl(g.type, b.size, props.shared)}
                      target="_blank"
                    >
                      {b.label}
                    </a>
                    <button
                      class="copy"
                      onclick={copyScript(
                        g.type,
                        b.size,
                        b.label,
                        props.shared,
                        "svg",
                      )}
                      title="Copy SVG URL"
                    >
                      <span class="copy-label">SVG</span>
                    </button>
                    <button
                      class="copy"
                      onclick={copyScript(
                        g.type,
                        b.size,
                        b.label,
                        props.shared,
                        "png",
                      )}
                      title="Copy PNG URL"
                    >
                      <span class="copy-label">PNG</span>
                    </button>
                  </div>
                  <img
                    class="badge-img"
                    alt={props.badgeAlt}
                    src={svgDataUri(b.svg)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div id="toast" class="toast" />
      </body>
    </html>
  );
}
