"use client";

import ShikiHighlighter from "react-shiki";

type Props = {
  code: string;
  language?: string;
};

export function Highlight(props: Props) {
  return (
    <ShikiHighlighter
      language={props.language ?? "json"}
      theme={{ dark: "vitesse-dark", light: "vitesse-light" }}
      addDefaultStyles={false}
      showLanguage={false}
      defaultColor="light-dark()"
      className="[&_pre]:border-border/50 [&_pre]:bg-muted/30 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:p-3 [&_pre]:text-xs [&_pre]:leading-relaxed"
    >
      {props.code}
    </ShikiHighlighter>
  );
}
