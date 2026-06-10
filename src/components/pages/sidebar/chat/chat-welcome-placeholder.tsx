import { getTranslations } from "next-intl/server";

// Server-rendered stand-in for ThreadWelcome so LCP lands at first paint, not
// after SQLocal + runtime init (was 8-10s on throttled mobile). globals.css
// hides it via :has() once the thread renders.
export async function ChatWelcomePlaceholder() {
  const t = await getTranslations();
  return (
    <div className="chat-welcome-placeholder pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-24">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="32"
            height="32"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-foreground text-lg font-semibold">
            {t("CHAT.EMPTY_TITLE")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("CHAT.EMPTY_DESCRIPTION")}
          </p>
        </div>
      </div>
    </div>
  );
}
