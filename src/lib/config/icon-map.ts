// Icon registry. Per-icon dynamic loaders so each library only enters the
// chunk graph when first rendered. Same pattern as `vendor-icons.ts`.
// Adding a new library = add a column to each entry. Adding a new icon =
// add a new entry. No call-site changes either way.

import type { IconType } from "react-icons";

export type IconLibraryName = "lucide" | "tabler";

export type IconLoader = () => Promise<{ default: IconType }>;

export type IconEntry = Partial<Record<IconLibraryName, IconLoader>>;

// Each loader resolves `{ default }` so it's compatible w/ `next/dynamic`.
// Bundler treats every `import("react-icons/lu")` as one chunk; first Lucide
// icon to render fetches the whole library, subsequent icons reuse it.
export const ICON_MAP: Record<string, IconEntry> = {
  "arrow-down": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuArrowDown })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbArrowDown })),
  },
  "arrow-down-right": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuArrowDownRight })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbArrowDownRight })),
  },
  "arrow-left": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuArrowLeft })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbArrowLeft })),
  },
  "arrow-left-right": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuArrowLeftRight })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbArrowsLeftRight })),
  },
  "arrow-right": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuArrowRight })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbArrowRight })),
  },
  "arrow-right-left": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuArrowRightLeft })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbArrowsRightLeft })),
  },
  "arrow-up": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuArrowUp })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbArrowUp })),
  },
  "arrow-up-down": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuArrowUpDown })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbArrowsUpDown })),
  },
  "arrow-up-right": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuArrowUpRight })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbArrowUpRight })),
  },
  "chevron-down": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuChevronDown })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbChevronDown })),
  },
  "chevron-left": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuChevronLeft })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbChevronLeft })),
  },
  "chevron-right": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuChevronRight })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbChevronRight })),
  },
  "chevrons-down-up": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuChevronsDownUp })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbChevronsDown })),
  },
  "chevrons-left": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuChevronsLeft })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbChevronsLeft })),
  },
  "chevrons-right": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuChevronsRight })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbChevronsRight })),
  },
  "chevrons-up-down": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuChevronsUpDown })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbChevronsUp })),
  },
  activity: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuActivity })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbActivity })),
  },
  check: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuCheck })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbCheck })),
  },
  "circle-alert": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuCircleAlert })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbAlertCircle })),
  },
  "circle-check": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuCircleCheck })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbCircleCheck })),
  },
  "circle-help": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuCircleHelp })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbHelpCircle })),
  },
  "circle-x": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuCircleX })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbCircleX })),
  },
  "triangle-alert": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuTriangleAlert })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbAlertTriangle })),
  },
  "octagon-x": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuOctagonX })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbOctagon })),
  },
  info: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuInfo })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbInfoCircle })),
  },
  loader: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuLoader })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbLoader })),
  },
  x: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuX })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbX })),
  },
  "chart-bar": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuChartBar })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbChartBar })),
  },
  "chart-column": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuChartColumn })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbChartColumn })),
  },
  "chart-column-big": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuChartColumnBig })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbChartColumn })),
  },
  "chart-pie": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuChartPie })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbChartPie })),
  },
  "trending-down": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuTrendingDown })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbTrendingDown })),
  },
  "trending-up": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuTrendingUp })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbTrendingUp })),
  },
  gauge: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuGauge })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbGauge })),
  },
  bell: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuBell })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbBell })),
  },
  binary: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuBinary })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbBinary })),
  },
  "book-open": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuBookOpen })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbBook })),
  },
  "book-text": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuBookText })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbBook })),
  },
  calendar: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuCalendar })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbCalendar })),
  },
  "clipboard-copy": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuClipboardCopy })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbClipboardCopy })),
  },
  "cloud-off": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuCloudOff })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbCloudOff })),
  },
  "cloud-upload": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuCloudUpload })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbCloudUpload })),
  },
  code: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuCode })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbCode })),
  },
  copy: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuCopy })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbCopy })),
  },
  cpu: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuCpu })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbCpu })),
  },
  database: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuDatabase })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbDatabase })),
  },
  dices: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuDices })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbDice })),
  },
  "dollar-sign": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuDollarSign })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbCurrencyDollar })),
  },
  download: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuDownload })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbDownload })),
  },
  drama: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuDrama })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbMasksTheater })),
  },
  ellipsis: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuEllipsis })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbDots })),
  },
  "ellipsis-vertical": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuEllipsisVertical })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbDotsVertical })),
  },
  eraser: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuEraser })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbEraser })),
  },
  "external-link": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuExternalLink })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbExternalLink })),
  },
  eye: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuEye })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbEye })),
  },
  "eye-off": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuEyeOff })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbEyeOff })),
  },
  file: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuFile })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbFile })),
  },
  "file-question": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuFileQuestion })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbFileUnknown })),
  },
  filter: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuFilter })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbFilter })),
  },
  fingerprint: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuFingerprint })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbFingerprint })),
  },
  gift: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuGift })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbGift })),
  },
  github: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuGithub })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbBrandGithub })),
  },
  globe: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuGlobe })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbWorld })),
  },
  "globe-lock": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuGlobeLock })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbWorld })),
  },
  grid: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuLayoutGrid })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbGridDots })),
  },
  "grip-vertical": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuGripVertical })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbGripVertical })),
  },
  hash: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuHash })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbHash })),
  },
  heart: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuHeart })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbHeart })),
  },
  "heart-pulse": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuHeartPulse })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbHeartbeat })),
  },
  house: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuHouse })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbHome })),
  },
  image: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuImage })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbPhoto })),
  },
  "image-down": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuImageDown })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbPhotoDown })),
  },
  key: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuKey })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbKey })),
  },
  "key-round": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuKeyRound })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbKey })),
  },
  layers: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuLayers })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbStack2 })),
  },
  "layout-dashboard": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuLayoutDashboard })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbLayoutDashboard })),
  },
  "layout-grid": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuLayoutGrid })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbLayoutGrid })),
  },
  link: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuLink })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbLink })),
  },
  lock: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuLock })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbLock })),
  },
  "log-in": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuLogIn })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbLogin })),
  },
  "log-out": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuLogOut })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbLogout })),
  },
  mail: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuMail })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbMail })),
  },
  maximize: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuMaximize })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbMaximize })),
  },
  menu: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuMenu })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbMenu2 })),
  },
  "message-circle": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuMessageCircle })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbMessageCircle })),
  },
  "message-square": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuMessageSquare })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbMessage })),
  },
  mic: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuMic })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbMicrophone })),
  },
  monitor: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuMonitor })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbDeviceDesktop })),
  },
  moon: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuMoon })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbMoon })),
  },
  music: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuMusic })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbMusic })),
  },
  newspaper: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuNewspaper })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbNews })),
  },
  paintbrush: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuPaintbrush })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbBrush })),
  },
  "panel-left": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuPanelLeft })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbLayoutSidebar })),
  },
  pencil: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuPencil })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbPencil })),
  },
  "pencil-ruler": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuPencilRuler })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbRulerMeasure })),
  },
  percent: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuPercent })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbPercentage })),
  },
  play: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuPlay })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbPlayerPlay })),
  },
  plus: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuPlus })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbPlus })),
  },
  power: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuPower })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbPower })),
  },
  "power-off": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuPowerOff })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbPlugOff })),
  },
  "refresh-ccw": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuRefreshCcw })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbRefresh })),
  },
  "refresh-cw": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuRefreshCw })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbRefresh })),
  },
  repeat: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuRepeat })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbRepeat })),
  },
  "rotate-ccw": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuRotateCcw })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbRotate })),
  },
  "rotate-cw": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuRotateCw })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbRotateClockwise })),
  },
  rss: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuRss })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbRss })),
  },
  "scroll-text": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuScrollText })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbFileText })),
  },
  search: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuSearch })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbSearch })),
  },
  send: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuSend })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbSend })),
  },
  server: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuServer })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbServer })),
  },
  settings: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuSettings })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbSettings })),
  },
  shield: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuShield })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbShield })),
  },
  "shield-check": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuShieldCheck })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbShieldCheck })),
  },
  shuffle: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuShuffle })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbArrowsShuffle })),
  },
  "sliders-horizontal": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({
        default: m.LuSlidersHorizontal,
      })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({
        default: m.TbAdjustmentsHorizontal,
      })),
  },
  sparkles: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuSparkles })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbSparkles })),
  },
  sun: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuSun })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbSun })),
  },
  tag: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuTag })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbTag })),
  },
  terminal: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuTerminal })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbTerminal2 })),
  },
  trash: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuTrash })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbTrash })),
  },
  trophy: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuTrophy })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbTrophy })),
  },
  type: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuType })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbTypography })),
  },
  upload: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuUpload })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbUpload })),
  },
  user: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuUser })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbUser })),
  },
  "user-plus": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuUserPlus })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbUserPlus })),
  },
  users: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuUsers })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbUsers })),
  },
  video: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuVideo })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbVideo })),
  },
  wallet: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuWallet })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbWallet })),
  },
  wand: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuWand })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbWand })),
  },
  zap: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuZap })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbBolt })),
  },
  "grid-3x3": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuGrid3X3 })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbGrid3X3 })),
  },
  "maximize-2": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuMaximize2 })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbMaximize })),
  },
  "settings-2": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuSettings2 })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbAdjustments })),
  },
  "trash-2": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuTrash2 })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbTrash })),
  },
  // Brand icons (Font Awesome / Simple Icons). No clean Tabler equivalents
  // for some; reuse Lucide brand icon (LuGithub) where available, fall back
  // to first library.
  "brand-apple": {
    lucide: () =>
      import("react-icons/fa").then((m) => ({ default: m.FaApple })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbBrandApple })),
  },
  "brand-discord": {
    lucide: () =>
      import("react-icons/fa").then((m) => ({ default: m.FaDiscord })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbBrandDiscord })),
  },
  "brand-github": {
    lucide: () =>
      import("react-icons/fa").then((m) => ({ default: m.FaGithub })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbBrandGithub })),
  },
  "brand-linux": {
    lucide: () =>
      import("react-icons/fa").then((m) => ({ default: m.FaLinux })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbBrandUbuntu })),
  },
  "brand-windows": {
    lucide: () =>
      import("react-icons/fa").then((m) => ({ default: m.FaWindows })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbBrandWindows })),
  },
  "brand-trustpilot": {
    lucide: () =>
      import("react-icons/si").then((m) => ({ default: m.SiTrustpilot })),
    tabler: () =>
      import("react-icons/si").then((m) => ({ default: m.SiTrustpilot })),
  },
  "brand-x-twitter": {
    lucide: () =>
      import("react-icons/fa6").then((m) => ({ default: m.FaXTwitter })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbBrandX })),
  },
  "brand-discord-si": {
    lucide: () =>
      import("react-icons/si").then((m) => ({ default: m.SiDiscord })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbBrandDiscord })),
  },
  broom: {
    lucide: () =>
      import("react-icons/gi").then((m) => ({ default: m.GiBroom })),
    tabler: () =>
      import("react-icons/gi").then((m) => ({ default: m.GiBroom })),
  },
  "crab-claw": {
    lucide: () =>
      import("react-icons/gi").then((m) => ({ default: m.GiCrabClaw })),
    tabler: () =>
      import("react-icons/gi").then((m) => ({ default: m.GiCrabClaw })),
  },
  fox: {
    lucide: () =>
      import("react-icons/gi").then((m) => ({ default: m.GiFox })),
    tabler: () =>
      import("react-icons/gi").then((m) => ({ default: m.GiFox })),
  },
  "dots-horizontal": {
    lucide: () =>
      import("react-icons/rx").then((m) => ({ default: m.RxDotsHorizontal })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbDots })),
  },
  brain: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuBrain })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbBrain })),
  },
  "x-circle": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuCircleX })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbCircleX })),
  },
  "alert-circle": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuCircleAlert })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbAlertCircle })),
  },
  "file-text": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuFileText })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbFileText })),
  },
  square: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuSquare })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbSquare })),
  },
  wrench: {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuWrench })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbTool })),
  },
  list: {
    lucide: () => import("react-icons/lu").then((m) => ({ default: m.LuList })),
    tabler: () => import("react-icons/tb").then((m) => ({ default: m.TbList })),
  },
  "plus-circle": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuCirclePlus })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbCirclePlus })),
  },
  "credit-card": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuCreditCard })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbCreditCard })),
  },
  "shopping-cart": {
    lucide: () =>
      import("react-icons/lu").then((m) => ({ default: m.LuShoppingCart })),
    tabler: () =>
      import("react-icons/tb").then((m) => ({ default: m.TbShoppingCart })),
  },
};

export type IconName = keyof typeof ICON_MAP;
