import dayjs from "dayjs";
import "dayjs/locale/de";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";

/**
 * Side-effect: extend the shared dayjs singleton with plugins.
 * Import this module once at the server entry (instrumentation.ts)
 * and once at the client entry (root layout) to activate plugins
 * for every `import dayjs from "dayjs"` across the app.
 */
dayjs.extend(relativeTime);
dayjs.extend(utc);

export type { Dayjs } from "dayjs";
export { dayjs };
