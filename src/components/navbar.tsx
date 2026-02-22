"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Menu, ChevronDown, BookOpen, Terminal, Cpu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/models", key: "MODELS" },
  { href: "/pricing", key: "PRICING" },
] as const;

const DOC_LINKS = [
  { href: "/docs/claude-code", key: "CLAUDE_CODE", icon: Terminal },
  { href: "/docs/codex", key: "CODEX", icon: Cpu },
  { href: "/docs/gemini-cli", key: "GEMINI_CLI", icon: Sparkles },
] as const;

export function Navbar() {
  const t = useTranslations("NAV");
  const pathname = usePathname();

  return (
    <header className="bg-background/80 border-border sticky top-0 z-50 border-b backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">UNO</span>
            <span className="text-primary text-lg font-bold">ROUTER</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={cn(
                  "text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(link.href) && "text-foreground"
                )}
              >
                {t(link.key)}
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "text-muted-foreground hover:text-foreground flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/docs") && "text-foreground"
                )}
              >
                {t("DOCS")}
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={8}>
                {DOC_LINKS.map((link) => (
                  <DropdownMenuItem key={link.key} render={<Link href={link.href} />}>
                    <link.icon className="h-4 w-4" />
                    {t(link.key)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" size="sm" render={<a href="https://api.unorouter.ai" />}>
              {t("LOG_IN")}
            </Button>
            <Button size="sm" render={<a href="https://api.unorouter.ai/register" />}>
              {t("GET_STARTED")}
            </Button>
          </div>

          <Sheet>
            <SheetTrigger
              className="md:hidden"
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <span className="font-bold">UNO</span>
                  <span className="text-primary font-bold">ROUTER</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className={cn(
                      "text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      pathname.startsWith(link.href) &&
                        "bg-accent text-foreground"
                    )}
                  >
                    {t(link.key)}
                  </Link>
                ))}
                <div className="py-2">
                  <p className="text-muted-foreground mb-1 px-3 text-xs font-medium uppercase tracking-wider">
                    {t("DOCS")}
                  </p>
                  {DOC_LINKS.map((link) => (
                    <Link
                      key={link.key}
                      href={link.href}
                      className={cn(
                        "text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        pathname.startsWith(link.href) &&
                          "bg-accent text-foreground"
                      )}
                    >
                      <link.icon className="h-4 w-4" />
                      {t(link.key)}
                    </Link>
                  ))}
                </div>
              </nav>
              <div className="mt-auto flex flex-col gap-2 p-4">
                <Button variant="outline" render={<a href="https://api.unorouter.ai" />}>
                  {t("LOG_IN")}
                </Button>
                <Button render={<a href="https://api.unorouter.ai/register" />}>
                  {t("GET_STARTED")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
