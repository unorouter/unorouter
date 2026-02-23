"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LuChevronDown, LuCpu, LuMenu, LuSparkles, LuTerminal, LuX } from "react-icons/lu";
import { useTranslations } from "next-intl";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/models", key: "MODELS" },
  { href: "/pricing", key: "PRICING" }
] as const;

const DOC_LINKS = [
  { href: "/docs/claude-code", key: "CLAUDE_CODE", icon: Terminal },
  { href: "/docs/codex", key: "CODEX", icon: Cpu },
  { href: "/docs/gemini-cli", key: "GEMINI_CLI", icon: Sparkles }
] as const;

export function Navbar() {
  const t = useTranslations("NAV");
  const pathname = usePathname();
  const [docsOpen, setDocsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/10 bg-[#050505]/80 backdrop-blur-md">
      <div className="max-w-360 mx-auto px-6 h-20 flex items-center justify-between font-mono">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-lg font-bold tracking-tight text-white group-hover:text-gray-300 transition-colors">
            UNO<span className="text-gray-600">ROUTER</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={cn(
                "text-[11px] font-medium transition-colors tracking-widest uppercase",
                pathname.startsWith(link.href)
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {t(link.key)}
            </Link>
          ))}

          <div className="relative">
            <button
              onClick={() => setDocsOpen(!docsOpen)}
              onBlur={() => setTimeout(() => setDocsOpen(false), 200)}
              className="text-[11px] font-medium transition-colors tracking-widest uppercase flex items-center gap-1 text-gray-400 hover:text-white"
            >
              {t("DOCS")}
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  docsOpen && "rotate-180"
                )}
              />
            </button>
            {docsOpen && (
              <div className="absolute top-full mt-2 left-0 w-48 bg-[#0a0a0a] border border-white/10 py-1">
                {DOC_LINKS.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className="flex items-center gap-2 px-4 py-2 text-[11px] text-gray-400 hover:text-white hover:bg-white/5 tracking-wider uppercase"
                  >
                    <link.icon className="h-3 w-3" />
                    {t(link.key)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-6">
          <a
            href="https://api.unorouter.ai"
            className="text-[11px] font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider"
          >
            {t("LOG_IN")}
          </a>
          <a
            href="https://api.unorouter.ai/register"
            className="px-5 py-2 bg-white text-black text-[11px] font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors"
          >
            {t("GET_STARTED")}
          </a>
        </div>

        {/* Mobile Menu */}
        <button
          className="md:hidden text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden bg-[#050505] border-t border-white/10 px-6 py-6 space-y-4 font-mono">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-gray-400 hover:text-white uppercase tracking-wider"
            >
              {t(link.key)}
            </Link>
          ))}
          <div className="space-y-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest">
              {t("DOCS")}
            </p>
            {DOC_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white uppercase tracking-wider"
              >
                <link.icon className="h-3 w-3" />
                {t(link.key)}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
            <a
              href="https://api.unorouter.ai"
              className="text-sm text-gray-400 hover:text-white uppercase tracking-wider"
            >
              {t("LOG_IN")}
            </a>
            <a
              href="https://api.unorouter.ai/register"
              className="px-5 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors text-center"
            >
              {t("GET_STARTED")}
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
