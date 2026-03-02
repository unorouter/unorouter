import { codeToHtml } from "shiki";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

type Props = {
  code: string;
  language?: string;
  className?: string;
};

export async function CodeBlock(props: Props) {
  const html = await codeToHtml(props.code, {
    lang: props.language ?? "text",
    themes: {
      light: "vitesse-light",
      dark: "vitesse-dark",
    },
    defaultColor: false,
  });

  return (
    <div
      className={cn(
        "w-full bg-card border border-border font-mono text-sm relative group rounded-sm overflow-hidden hover:border-foreground/20 transition-colors duration-500",
        props.className,
      )}
    >
      {props.language && (
        <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border/50">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {props.language}
          </span>
          <div className="flex gap-1.5 opacity-50">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
          </div>
        </div>
      )}
      <div
        className="p-8 [&_pre]:font-mono [&_pre]:text-xs md:[&_pre]:text-sm [&_pre]:leading-relaxed [&_pre]:whitespace-pre-wrap [&_pre]:break-all [&_pre]:bg-transparent! [&_code]:bg-transparent!"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <CopyButton
        text={props.code}
        className="absolute top-16 right-6 text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-sm"
      />
    </div>
  );
}
