import { themeHook } from "./hooks";

const config = {
  site: "https://unorouter.ai",
  urls: ["/en"],
  lighthouseOptions: {
    formFactor: "mobile",
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      disabled: false,
    },
    throttlingMethod: "simulate",
    throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 },
  },
  hooks: themeHook("dark"),
};

export default config;
