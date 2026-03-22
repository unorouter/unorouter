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
        "bg-card border-border group hover:border-foreground/20 relative w-full overflow-hidden rounded-sm border font-mono text-sm transition-colors duration-500",
        props.className,
      )}
    >
      {props.language && (
        <div className="bg-muted border-border/50 flex items-center justify-between border-b px-4 py-3">
          <div className="flex gap-1.5">
            <div className="bg-muted-foreground/20 h-2 w-2 rounded-full" />
            <div className="bg-muted-foreground/20 h-2 w-2 rounded-full" />
            <div className="bg-muted-foreground/20 h-2 w-2 rounded-full" />
          </div>
          <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
            {props.language}
          </span>
        </div>
      )}
      <div
        className="p-8 [&_code]:bg-transparent! [&_pre]:bg-transparent! [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed [&_pre]:break-all [&_pre]:whitespace-pre-wrap md:[&_pre]:text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <CopyButton
        text={props.code}
        className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-16 right-6 rounded-sm p-2 transition-colors"
      />
    </div>
  );
}
