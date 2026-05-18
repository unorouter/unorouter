"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { Component, type PropsWithChildren, type ReactNode } from "react";

type FallbackProps = { error: Error; reset: () => void };

function SectionFallback(props: FallbackProps) {
  return <SectionFallbackInner error={props.error} reset={props.reset} />;
}

function SectionFallbackInner(props: FallbackProps) {
  const t = useTranslations();

  return (
    <div className="border-destructive/20 bg-destructive/5 flex items-center gap-3 rounded-lg border p-4">
      <Icon
        name="triangle-alert"
        className="text-destructive h-4 w-4 shrink-0"
      />
      <span className="text-muted-foreground text-sm">
        {t("MAIN.ERROR.SECTION_LOAD_FAILED")}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={props.reset}
        className="ml-auto shrink-0"
      >
        <Icon name="refresh-cw" className="mr-1.5 h-3 w-3" />
        {t("MAIN.ACTIONS.TRY_AGAIN")}
      </Button>
    </div>
  );
}

type State = { error: Error | null };

export class SectionBoundary extends Component<
  PropsWithChildren<{ fallback?: (props: FallbackProps) => ReactNode }>,
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      const Fallback = this.props.fallback ?? SectionFallback;
      return <Fallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}
