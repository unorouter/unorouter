import { themeHook } from "./hooks";

const config = {
  site: "https://unorouter.ai",
  urls: ["/en"],
  lighthouseOptions: {
    formFactor: "desktop",
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false,
    },
    throttlingMethod: "simulate",
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
  },
  hooks: themeHook("dark"),
};

export default config;
