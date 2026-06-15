import { getTranslations } from "next-intl/server";

    // Server-rendered stand-in hiding the runtime's staged assembly; globals.css drops it once the composer exists.
export async function ChatWelcomePlaceholder() {
  const t = await getTranslations();
  return (
    <div className="chat-welcome-placeholder bg-background pointer-events-none absolute inset-0 z-10 flex flex-col">
      <div className="flex flex-1 flex-col items-center justify-center">
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
      {/* Composer skeleton: same width/radius/padding as the real shell. */}
      <div className="mx-auto w-full max-w-176 px-4 pb-[max(--spacing(1),env(safe-area-inset-bottom))] md:pb-[max(--spacing(2.5),env(safe-area-inset-bottom))]">
        <div className="bg-background flex w-full flex-col gap-2 rounded-3xl border p-2.5">
          <p className="text-muted-foreground/80 px-1.75 py-1 text-sm">
            {t("CHAT.INPUT_PLACEHOLDER")}
          </p>
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
