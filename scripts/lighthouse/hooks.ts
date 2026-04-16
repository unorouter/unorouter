type MediaFeature = { name: string; value: string };

type PuppeteerPage = {
  emulateMediaFeatures: (features: MediaFeature[]) => Promise<void>;
  evaluateOnNewDocument: <T extends unknown[]>(
    fn: (...args: T) => void,
    ...args: T
  ) => Promise<unknown>;
};

export function themeHook(theme: "dark" | "light") {
  return {
    "puppeteer:before-goto": async (page: PuppeteerPage) => {
      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: theme },
      ]);
      await page.evaluateOnNewDocument(
        (t: string) => {
          try {
            localStorage.setItem("theme", t);
          } catch {}
        },
        theme,
      );
    },
  };
}
