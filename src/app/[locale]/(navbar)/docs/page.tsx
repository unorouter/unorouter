import { redirect } from "@/i18n/navigation";

export default function DocsPage() {
  redirect({ href: "/docs/claude-code", locale: "en" });
}
