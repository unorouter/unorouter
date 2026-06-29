// Per-icon dynamic loaders; each enters the chunk graph on first render, missing key falls back to lucide. GENERATED; edit the script.

export type IconLibraryName =
  | "lucide"
  | "tabler"
  | "phosphor"
  | "heroicons"
  | "remix"
  | "iconoir";

export type IconComponent = React.ComponentType<{
  size?: number | string;
  className?: string;
}>;

export type IconLoader = () => Promise<{ default: IconComponent }>;

type IconEntry = Partial<Record<IconLibraryName, IconLoader>>;

export const ICON_MAP: Record<string, IconEntry> = {
  "arrow-down": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-down.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowDown.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowDown").then((m) => ({
        default: m.ArrowDown,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowDownIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowDownLine,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowDown"),
  },
  "arrow-down-right": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-down-right.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowDownRight.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowDownRight").then((m) => ({
        default: m.ArrowDownRight,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowDownRightIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowRightDownLine,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowDownRight"),
  },
  "arrow-left": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-left.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowLeft.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowLeft").then((m) => ({
        default: m.ArrowLeft,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowLeftLine,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowLeft"),
  },
  "arrow-left-right": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-left-right.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowsLeftRight.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowsLeftRight").then((m) => ({
        default: m.ArrowsLeftRight,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowsRightLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowLeftRightLine,
      })),
  },
  "arrow-right": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-right.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowRight.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowRight").then((m) => ({
        default: m.ArrowRight,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowRightIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowRightLine,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowRight"),
  },
  "arrow-right-left": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-right-left.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowsRightLeft.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowsLeftRight").then((m) => ({
        default: m.ArrowsLeftRight,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowsRightLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowLeftRightLine,
      })),
  },
  "arrow-up": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-up.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconArrowUp.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowUp").then((m) => ({
        default: m.ArrowUp,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowUpIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowUpLine,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowUp"),
  },
  "arrow-up-down": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-up-down.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowsUpDown.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowsDownUp").then((m) => ({
        default: m.ArrowsDownUp,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowsUpDownIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowUpDownLine,
      })),
    iconoir: () => import("iconoir-react/regular/DataTransferBoth"),
  },
  "arrow-up-right": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-up-right.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowUpRight.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowUpRight").then((m) => ({
        default: m.ArrowUpRight,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowUpRightIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowRightUpLine,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowUpRight"),
  },
  "chevron-down": {
    lucide: () => import("lucide-react/dist/esm/icons/chevron-down.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChevronDown.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CaretDown").then((m) => ({
        default: m.CaretDown,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChevronDownIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowDownSLine,
      })),
    iconoir: () => import("iconoir-react/regular/NavArrowDown"),
  },
  "chevron-left": {
    lucide: () => import("lucide-react/dist/esm/icons/chevron-left.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChevronLeft.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CaretLeft").then((m) => ({
        default: m.CaretLeft,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChevronLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowLeftSLine,
      })),
    iconoir: () => import("iconoir-react/regular/NavArrowLeft"),
  },
  "chevron-right": {
    lucide: () => import("lucide-react/dist/esm/icons/chevron-right.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChevronRight.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CaretRight").then((m) => ({
        default: m.CaretRight,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChevronRightIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowRightSLine,
      })),
    iconoir: () => import("iconoir-react/regular/NavArrowRight"),
  },
  "chevrons-down-up": {
    lucide: () => import("lucide-react/dist/esm/icons/chevrons-down-up.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChevronsDown.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowsInLineVertical").then(
        (m) => ({
          default: m.ArrowsInLineVertical,
        }),
      ),
    heroicons: () => import("@heroicons/react/24/outline/ChevronUpDownIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiContractUpDownLine,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowUnionVertical"),
  },
  "chevrons-left": {
    lucide: () => import("lucide-react/dist/esm/icons/chevrons-left.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChevronsLeft.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CaretDoubleLeft").then((m) => ({
        default: m.CaretDoubleLeft,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ChevronDoubleLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowLeftDoubleLine,
      })),
    iconoir: () => import("iconoir-react/regular/FastArrowLeft"),
  },
  "chevrons-right": {
    lucide: () => import("lucide-react/dist/esm/icons/chevrons-right.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChevronsRight.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CaretDoubleRight").then((m) => ({
        default: m.CaretDoubleRight,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ChevronDoubleRightIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowRightDoubleLine,
      })),
    iconoir: () => import("iconoir-react/regular/FastArrowRight"),
  },
  "chevrons-up-down": {
    lucide: () => import("lucide-react/dist/esm/icons/chevrons-up-down.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChevronsUp.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CaretUpDown").then((m) => ({
        default: m.CaretUpDown,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChevronUpDownIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiExpandUpDownLine,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowSeparateVertical"),
  },
  activity: {
    lucide: () => import("lucide-react/dist/esm/icons/activity.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconActivity.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Pulse").then((m) => ({
        default: m.Pulse,
      })),
    heroicons: () => import("@heroicons/react/24/outline/SignalIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPulseLine,
      })),
    iconoir: () => import("iconoir-react/regular/Activity"),
  },
  check: {
    lucide: () => import("lucide-react/dist/esm/icons/check.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCheck.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Check").then((m) => ({
        default: m.Check,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CheckIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCheckLine,
      })),
    iconoir: () => import("iconoir-react/regular/Check"),
  },
  "circle-alert": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-alert.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconAlertCircle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/WarningCircle").then((m) => ({
        default: m.WarningCircle,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ExclamationCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiErrorWarningLine,
      })),
    iconoir: () => import("iconoir-react/regular/WarningCircle"),
  },
  "circle-check": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-check.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconCircleCheck.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CheckCircle").then((m) => ({
        default: m.CheckCircle,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CheckCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCheckboxCircleLine,
      })),
    iconoir: () => import("iconoir-react/regular/CheckCircle"),
  },
  "circle-help": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-help.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconHelpCircle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Question").then((m) => ({
        default: m.Question,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/QuestionMarkCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiQuestionLine,
      })),
    iconoir: () => import("iconoir-react/regular/HelpCircle"),
  },
  "circle-x": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-x.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCircleX.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/XCircle").then((m) => ({
        default: m.XCircle,
      })),
    heroicons: () => import("@heroicons/react/24/outline/XCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCloseCircleLine,
      })),
    iconoir: () => import("iconoir-react/regular/XmarkCircle"),
  },
  "triangle-alert": {
    lucide: () => import("lucide-react/dist/esm/icons/triangle-alert.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconAlertTriangle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Warning").then((m) => ({
        default: m.Warning,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ExclamationTriangleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiAlertLine,
      })),
    iconoir: () => import("iconoir-react/regular/WarningTriangle"),
  },
  "octagon-x": {
    lucide: () => import("lucide-react/dist/esm/icons/octagon-x.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconOctagon.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Prohibit").then((m) => ({
        default: m.Prohibit,
      })),
    heroicons: () => import("@heroicons/react/24/outline/NoSymbolIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiForbidLine,
      })),
    iconoir: () => import("iconoir-react/regular/Prohibition"),
  },
  info: {
    lucide: () => import("lucide-react/dist/esm/icons/info.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconInfoCircle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Info").then((m) => ({
        default: m.Info,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/InformationCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiInformationLine,
      })),
    iconoir: () => import("iconoir-react/regular/InfoCircle"),
  },
  loader: {
    lucide: () => import("lucide-react/dist/esm/icons/loader.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconLoader.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Spinner").then((m) => ({
        default: m.Spinner,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowPathIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLoaderLine,
      })),
    iconoir: () => import("iconoir-react/regular/RefreshDouble"),
  },
  x: {
    lucide: () => import("lucide-react/dist/esm/icons/x.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconX.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/X").then((m) => ({
        default: m.X,
      })),
    heroicons: () => import("@heroicons/react/24/outline/XMarkIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCloseLine,
      })),
    iconoir: () => import("iconoir-react/regular/Xmark"),
  },
  "chart-bar": {
    lucide: () => import("lucide-react/dist/esm/icons/chart-bar.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconChartBar.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ChartBar").then((m) => ({
        default: m.ChartBar,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChartBarIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBarChartHorizontalLine,
      })),
    iconoir: () => import("iconoir-react/regular/StatsReport"),
  },
  "chart-column": {
    lucide: () => import("lucide-react/dist/esm/icons/chart-column.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChartColumn.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ChartBar").then((m) => ({
        default: m.ChartBar,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChartBarIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBarChartLine,
      })),
    iconoir: () => import("iconoir-react/regular/StatsUpSquare"),
  },
  "chart-column-big": {
    lucide: () => import("lucide-react/dist/esm/icons/chart-column-big.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChartColumn.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ChartBar").then((m) => ({
        default: m.ChartBar,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChartBarIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBarChart2Line,
      })),
    iconoir: () => import("iconoir-react/regular/StatsUpSquare"),
  },
  "chart-pie": {
    lucide: () => import("lucide-react/dist/esm/icons/chart-pie.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconChartPie.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ChartPie").then((m) => ({
        default: m.ChartPie,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChartPieIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPieChartLine,
      })),
  },
  "trending-down": {
    lucide: () => import("lucide-react/dist/esm/icons/trending-down.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconTrendingDown.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/TrendDown").then((m) => ({
        default: m.TrendDown,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ArrowTrendingDownIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiStockLine,
      })),
    iconoir: () => import("iconoir-react/regular/GraphDown"),
  },
  "trending-up": {
    lucide: () => import("lucide-react/dist/esm/icons/trending-up.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconTrendingUp.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/TrendUp").then((m) => ({
        default: m.TrendUp,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowTrendingUpIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLineChartLine,
      })),
    iconoir: () => import("iconoir-react/regular/GraphUp"),
  },
  gauge: {
    lucide: () => import("lucide-react/dist/esm/icons/gauge.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconGauge.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Gauge").then((m) => ({
        default: m.Gauge,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDashboard3Line,
      })),
    iconoir: () => import("iconoir-react/regular/DashboardSpeed"),
  },
  bell: {
    lucide: () => import("lucide-react/dist/esm/icons/bell.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBell.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Bell").then((m) => ({
        default: m.Bell,
      })),
    heroicons: () => import("@heroicons/react/24/outline/BellIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBellLine,
      })),
    iconoir: () => import("iconoir-react/regular/Bell"),
  },
  binary: {
    lucide: () => import("lucide-react/dist/esm/icons/binary.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBinary.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Binary").then((m) => ({
        default: m.Binary,
      })),
  },
  "book-open": {
    lucide: () => import("lucide-react/dist/esm/icons/book-open.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBook.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/BookOpen").then((m) => ({
        default: m.BookOpen,
      })),
    heroicons: () => import("@heroicons/react/24/outline/BookOpenIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBookOpenLine,
      })),
    iconoir: () => import("iconoir-react/regular/OpenBook"),
  },
  "book-text": {
    lucide: () => import("lucide-react/dist/esm/icons/book-text.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBook.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/BookOpenText").then((m) => ({
        default: m.BookOpenText,
      })),
    heroicons: () => import("@heroicons/react/24/outline/BookOpenIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBookOpenLine,
      })),
    iconoir: () => import("iconoir-react/regular/OpenBook"),
  },
  calendar: {
    lucide: () => import("lucide-react/dist/esm/icons/calendar.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCalendar.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Calendar").then((m) => ({
        default: m.Calendar,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CalendarIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCalendarLine,
      })),
    iconoir: () => import("iconoir-react/regular/Calendar"),
  },
  "clipboard-copy": {
    lucide: () => import("lucide-react/dist/esm/icons/clipboard-copy.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconClipboardCopy.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ClipboardText").then((m) => ({
        default: m.ClipboardText,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ClipboardDocumentIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiClipboardLine,
      })),
    iconoir: () => import("iconoir-react/regular/PasteClipboard"),
  },
  "cloud-off": {
    lucide: () => import("lucide-react/dist/esm/icons/cloud-off.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCloudOff.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CloudSlash").then((m) => ({
        default: m.CloudSlash,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCloudOffLine,
      })),
    iconoir: () => import("iconoir-react/regular/CloudXmark"),
  },
  "cloud-upload": {
    lucide: () => import("lucide-react/dist/esm/icons/cloud-upload.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconCloudUpload.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CloudArrowUp").then((m) => ({
        default: m.CloudArrowUp,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CloudArrowUpIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiUploadCloud2Line,
      })),
    iconoir: () => import("iconoir-react/regular/CloudUpload"),
  },
  clock: {
    lucide: () => import("lucide-react/dist/esm/icons/clock.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconClock.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Clock").then((m) => ({
        default: m.Clock,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ClockIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiTimeLine,
      })),
    iconoir: () => import("iconoir-react/regular/Clock"),
  },
  code: {
    lucide: () => import("lucide-react/dist/esm/icons/code.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCode.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Code").then((m) => ({
        default: m.Code,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CodeBracketIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCodeLine,
      })),
    iconoir: () => import("iconoir-react/regular/Code"),
  },
  copy: {
    lucide: () => import("lucide-react/dist/esm/icons/copy.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCopy.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Copy").then((m) => ({
        default: m.Copy,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/DocumentDuplicateIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFileCopyLine,
      })),
    iconoir: () => import("iconoir-react/regular/Copy"),
  },
  cpu: {
    lucide: () => import("lucide-react/dist/esm/icons/cpu.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCpu.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Cpu").then((m) => ({
        default: m.Cpu,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CpuChipIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCpuLine,
      })),
    iconoir: () => import("iconoir-react/regular/Cpu"),
  },
  database: {
    lucide: () => import("lucide-react/dist/esm/icons/database.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconDatabase.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Database").then((m) => ({
        default: m.Database,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CircleStackIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDatabaseLine,
      })),
    iconoir: () => import("iconoir-react/regular/Database"),
  },
  dices: {
    lucide: () => import("lucide-react/dist/esm/icons/dices.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconDice.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/DiceFive").then((m) => ({
        default: m.DiceFive,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDiceLine,
      })),
    iconoir: () => import("iconoir-react/regular/DiceFive"),
  },
  "dollar-sign": {
    lucide: () => import("lucide-react/dist/esm/icons/dollar-sign.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconCurrencyDollar.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CurrencyDollar").then((m) => ({
        default: m.CurrencyDollar,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CurrencyDollarIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMoneyDollarCircleLine,
      })),
    iconoir: () => import("iconoir-react/regular/Dollar"),
  },
  download: {
    lucide: () => import("lucide-react/dist/esm/icons/download.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconDownload.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Download").then((m) => ({
        default: m.Download,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowDownTrayIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDownloadLine,
      })),
    iconoir: () => import("iconoir-react/regular/Download"),
  },
  drama: {
    lucide: () => import("lucide-react/dist/esm/icons/drama.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconMasksTheater.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/MaskHappy").then((m) => ({
        default: m.MaskHappy,
      })),
  },
  ellipsis: {
    lucide: () => import("lucide-react/dist/esm/icons/ellipsis.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconDots.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/DotsThree").then((m) => ({
        default: m.DotsThree,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/EllipsisHorizontalIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMoreLine,
      })),
    iconoir: () => import("iconoir-react/regular/MoreHoriz"),
  },
  "ellipsis-vertical": {
    lucide: () => import("lucide-react/dist/esm/icons/ellipsis-vertical.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconDotsVertical.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/DotsThreeVertical").then((m) => ({
        default: m.DotsThreeVertical,
      })),
    heroicons: () => import("@heroicons/react/24/outline/EllipsisVerticalIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMore2Line,
      })),
    iconoir: () => import("iconoir-react/regular/MoreVert"),
  },
  eraser: {
    lucide: () => import("lucide-react/dist/esm/icons/eraser.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconEraser.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Eraser").then((m) => ({
        default: m.Eraser,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiEraserLine,
      })),
    iconoir: () => import("iconoir-react/regular/Erase"),
  },
  "external-link": {
    lucide: () => import("lucide-react/dist/esm/icons/external-link.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconExternalLink.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowSquareOut").then((m) => ({
        default: m.ArrowSquareOut,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ArrowTopRightOnSquareIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiExternalLinkLine,
      })),
    iconoir: () => import("iconoir-react/regular/OpenNewWindow"),
  },
  eye: {
    lucide: () => import("lucide-react/dist/esm/icons/eye.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconEye.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Eye").then((m) => ({
        default: m.Eye,
      })),
    heroicons: () => import("@heroicons/react/24/outline/EyeIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiEyeLine,
      })),
    iconoir: () => import("iconoir-react/regular/Eye"),
  },
  "eye-off": {
    lucide: () => import("lucide-react/dist/esm/icons/eye-off.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconEyeOff.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/EyeSlash").then((m) => ({
        default: m.EyeSlash,
      })),
    heroicons: () => import("@heroicons/react/24/outline/EyeSlashIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiEyeOffLine,
      })),
    iconoir: () => import("iconoir-react/regular/EyeClosed"),
  },
  file: {
    lucide: () => import("lucide-react/dist/esm/icons/file.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconFile.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/File").then((m) => ({
        default: m.File,
      })),
    heroicons: () => import("@heroicons/react/24/outline/DocumentIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFileLine,
      })),
    iconoir: () => import("iconoir-react/regular/Page"),
  },
  "file-question": {
    lucide: () => import("lucide-react/dist/esm/icons/file-question.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconFileUnknown.mjs"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFileUnknowLine,
      })),
  },
  filter: {
    lucide: () => import("lucide-react/dist/esm/icons/filter.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconFilter.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/FunnelSimple").then((m) => ({
        default: m.FunnelSimple,
      })),
    heroicons: () => import("@heroicons/react/24/outline/FunnelIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFilterLine,
      })),
    iconoir: () => import("iconoir-react/regular/Filter"),
  },
  fingerprint: {
    lucide: () => import("lucide-react/dist/esm/icons/fingerprint-pattern.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconFingerprint.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Fingerprint").then((m) => ({
        default: m.Fingerprint,
      })),
    heroicons: () => import("@heroicons/react/24/outline/FingerPrintIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFingerprintLine,
      })),
    iconoir: () => import("iconoir-react/regular/Fingerprint"),
  },
  gift: {
    lucide: () => import("lucide-react/dist/esm/icons/gift.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconGift.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Gift").then((m) => ({
        default: m.Gift,
      })),
    heroicons: () => import("@heroicons/react/24/outline/GiftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiGiftLine,
      })),
    iconoir: () => import("iconoir-react/regular/Gift"),
  },
  github: {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.GithubIcon,
      })),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconBrandGithub.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/GithubLogo").then((m) => ({
        default: m.GithubLogo,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiGithubLine,
      })),
    iconoir: () => import("iconoir-react/regular/Github"),
  },
  globe: {
    lucide: () => import("lucide-react/dist/esm/icons/globe.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconWorld.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Globe").then((m) => ({
        default: m.Globe,
      })),
    heroicons: () => import("@heroicons/react/24/outline/GlobeAltIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiGlobeLine,
      })),
    iconoir: () => import("iconoir-react/regular/Globe"),
  },
  "globe-lock": {
    lucide: () => import("lucide-react/dist/esm/icons/globe-lock.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconWorld.mjs"),
  },
  grid: {
    lucide: () => import("lucide-react/dist/esm/icons/layout-grid.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconGridDots.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/GridFour").then((m) => ({
        default: m.GridFour,
      })),
    heroicons: () => import("@heroicons/react/24/outline/Squares2X2Icon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLayoutGridLine,
      })),
    iconoir: () => import("iconoir-react/regular/ViewGrid"),
  },
  "grip-vertical": {
    lucide: () => import("lucide-react/dist/esm/icons/grip-vertical.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconGripVertical.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/DotsSixVertical").then((m) => ({
        default: m.DotsSixVertical,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDraggable,
      })),
  },
  hash: {
    lucide: () => import("lucide-react/dist/esm/icons/hash.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconHash.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Hash").then((m) => ({
        default: m.Hash,
      })),
    heroicons: () => import("@heroicons/react/24/outline/HashtagIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiHashtag,
      })),
    iconoir: () => import("iconoir-react/regular/Hashtag"),
  },
  heart: {
    lucide: () => import("lucide-react/dist/esm/icons/heart.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconHeart.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Heart").then((m) => ({
        default: m.Heart,
      })),
    heroicons: () => import("@heroicons/react/24/outline/HeartIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiHeartLine,
      })),
    iconoir: () => import("iconoir-react/regular/Heart"),
  },
  "heart-pulse": {
    lucide: () => import("lucide-react/dist/esm/icons/heart-pulse.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconHeartbeat.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Heartbeat").then((m) => ({
        default: m.Heartbeat,
      })),
    heroicons: () => import("@heroicons/react/24/outline/HeartIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiHeartPulseLine,
      })),
  },
  house: {
    lucide: () => import("lucide-react/dist/esm/icons/house.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconHome.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/House").then((m) => ({
        default: m.House,
      })),
    heroicons: () => import("@heroicons/react/24/outline/HomeIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiHome4Line,
      })),
    iconoir: () => import("iconoir-react/regular/Home"),
  },
  image: {
    lucide: () => import("lucide-react/dist/esm/icons/image.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconPhoto.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Image").then((m) => ({
        default: m.Image,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PhotoIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiImageLine,
      })),
    iconoir: () => import("iconoir-react/regular/MediaImage"),
  },
  "image-down": {
    lucide: () => import("lucide-react/dist/esm/icons/image-down.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconPhotoDown.mjs"),
    iconoir: () => import("iconoir-react/regular/MediaImage"),
  },
  key: {
    lucide: () => import("lucide-react/dist/esm/icons/key.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconKey.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Key").then((m) => ({
        default: m.Key,
      })),
    heroicons: () => import("@heroicons/react/24/outline/KeyIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiKeyLine,
      })),
    iconoir: () => import("iconoir-react/regular/Key"),
  },
  "key-round": {
    lucide: () => import("lucide-react/dist/esm/icons/key-round.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconKey.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Key").then((m) => ({
        default: m.Key,
      })),
    heroicons: () => import("@heroicons/react/24/outline/KeyIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiKey2Line,
      })),
    iconoir: () => import("iconoir-react/regular/Key"),
  },
  layers: {
    lucide: () => import("lucide-react/dist/esm/icons/layers.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconStack2.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Stack").then((m) => ({
        default: m.Stack,
      })),
    heroicons: () => import("@heroicons/react/24/outline/Square3Stack3DIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiStackLine,
      })),
  },
  "layout-dashboard": {
    lucide: () => import("lucide-react/dist/esm/icons/layout-dashboard.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconLayoutDashboard.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SquaresFour").then((m) => ({
        default: m.SquaresFour,
      })),
    heroicons: () => import("@heroicons/react/24/outline/Squares2X2Icon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDashboardLine,
      })),
    iconoir: () => import("iconoir-react/regular/Dashboard"),
  },
  "layout-grid": {
    lucide: () => import("lucide-react/dist/esm/icons/layout-grid.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconLayoutGrid.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SquaresFour").then((m) => ({
        default: m.SquaresFour,
      })),
    heroicons: () => import("@heroicons/react/24/outline/Squares2X2Icon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLayoutGridLine,
      })),
    iconoir: () => import("iconoir-react/regular/ViewGrid"),
  },
  link: {
    lucide: () => import("lucide-react/dist/esm/icons/link.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconLink.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Link").then((m) => ({
        default: m.Link,
      })),
    heroicons: () => import("@heroicons/react/24/outline/LinkIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLink,
      })),
    iconoir: () => import("iconoir-react/regular/Link"),
  },
  lock: {
    lucide: () => import("lucide-react/dist/esm/icons/lock.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconLock.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Lock").then((m) => ({
        default: m.Lock,
      })),
    heroicons: () => import("@heroicons/react/24/outline/LockClosedIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLockLine,
      })),
    iconoir: () => import("iconoir-react/regular/Lock"),
  },
  "log-in": {
    lucide: () => import("lucide-react/dist/esm/icons/log-in.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconLogin.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SignIn").then((m) => ({
        default: m.SignIn,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ArrowRightEndOnRectangleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLoginBoxLine,
      })),
    iconoir: () => import("iconoir-react/regular/LogIn"),
  },
  "log-out": {
    lucide: () => import("lucide-react/dist/esm/icons/log-out.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconLogout.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SignOut").then((m) => ({
        default: m.SignOut,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ArrowRightStartOnRectangleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLogoutBoxLine,
      })),
    iconoir: () => import("iconoir-react/regular/LogOut"),
  },
  mail: {
    lucide: () => import("lucide-react/dist/esm/icons/mail.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconMail.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/EnvelopeSimple").then((m) => ({
        default: m.EnvelopeSimple,
      })),
    heroicons: () => import("@heroicons/react/24/outline/EnvelopeIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMailLine,
      })),
    iconoir: () => import("iconoir-react/regular/Mail"),
  },
  menu: {
    lucide: () => import("lucide-react/dist/esm/icons/menu.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconMenu2.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/List").then((m) => ({
        default: m.List,
      })),
    heroicons: () => import("@heroicons/react/24/outline/Bars3Icon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMenuLine,
      })),
    iconoir: () => import("iconoir-react/regular/Menu"),
  },
  "message-circle": {
    lucide: () => import("lucide-react/dist/esm/icons/message-circle.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconMessageCircle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ChatCircle").then((m) => ({
        default: m.ChatCircle,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ChatBubbleOvalLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiChat1Line,
      })),
    iconoir: () => import("iconoir-react/regular/ChatBubbleEmpty"),
  },
  "message-square": {
    lucide: () => import("lucide-react/dist/esm/icons/message-square.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconMessage.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Chat").then((m) => ({
        default: m.Chat,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChatBubbleLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiChat4Line,
      })),
    iconoir: () => import("iconoir-react/regular/ChatLines"),
  },
  mic: {
    lucide: () => import("lucide-react/dist/esm/icons/mic.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconMicrophone.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Microphone").then((m) => ({
        default: m.Microphone,
      })),
    heroicons: () => import("@heroicons/react/24/outline/MicrophoneIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMicLine,
      })),
    iconoir: () => import("iconoir-react/regular/Microphone"),
  },
  monitor: {
    lucide: () => import("lucide-react/dist/esm/icons/monitor.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconDeviceDesktop.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Monitor").then((m) => ({
        default: m.Monitor,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ComputerDesktopIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiComputerLine,
      })),
    iconoir: () => import("iconoir-react/regular/Computer"),
  },
  moon: {
    lucide: () => import("lucide-react/dist/esm/icons/moon.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconMoon.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Moon").then((m) => ({
        default: m.Moon,
      })),
    heroicons: () => import("@heroicons/react/24/outline/MoonIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMoonLine,
      })),
    iconoir: () => import("iconoir-react/regular/HalfMoon"),
  },
  music: {
    lucide: () => import("lucide-react/dist/esm/icons/music.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconMusic.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/MusicNotes").then((m) => ({
        default: m.MusicNotes,
      })),
    heroicons: () => import("@heroicons/react/24/outline/MusicalNoteIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMusicLine,
      })),
    iconoir: () => import("iconoir-react/regular/MusicDoubleNote"),
  },
  newspaper: {
    lucide: () => import("lucide-react/dist/esm/icons/newspaper.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconNews.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Newspaper").then((m) => ({
        default: m.Newspaper,
      })),
    heroicons: () => import("@heroicons/react/24/outline/NewspaperIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiNewspaperLine,
      })),
  },
  paintbrush: {
    lucide: () => import("lucide-react/dist/esm/icons/paintbrush.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBrush.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/PaintBrush").then((m) => ({
        default: m.PaintBrush,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PaintBrushIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBrushLine,
      })),
    iconoir: () => import("iconoir-react/regular/Palette"),
  },
  "panel-left": {
    lucide: () => import("lucide-react/dist/esm/icons/panel-left.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconLayoutSidebar.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SidebarSimple").then((m) => ({
        default: m.SidebarSimple,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLayoutLeftLine,
      })),
    iconoir: () => import("iconoir-react/regular/SidebarCollapse"),
  },
  pencil: {
    lucide: () => import("lucide-react/dist/esm/icons/pencil.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconPencil.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Pencil").then((m) => ({
        default: m.Pencil,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PencilIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPencilLine,
      })),
    iconoir: () => import("iconoir-react/regular/EditPencil"),
  },
  "pencil-ruler": {
    lucide: () => import("lucide-react/dist/esm/icons/pencil-ruler.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconRulerMeasure.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/PencilRuler").then((m) => ({
        default: m.PencilRuler,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PencilSquareIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPencilRulerLine,
      })),
    iconoir: () => import("iconoir-react/regular/DesignPencil"),
  },
  percent: {
    lucide: () => import("lucide-react/dist/esm/icons/percent.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconPercentage.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Percent").then((m) => ({
        default: m.Percent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PercentBadgeIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPercentLine,
      })),
    iconoir: () => import("iconoir-react/regular/Percentage"),
  },
  play: {
    lucide: () => import("lucide-react/dist/esm/icons/play.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconPlayerPlay.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Play").then((m) => ({
        default: m.Play,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PlayIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPlayLine,
      })),
    iconoir: () => import("iconoir-react/regular/Play"),
  },
  plus: {
    lucide: () => import("lucide-react/dist/esm/icons/plus.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconPlus.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Plus").then((m) => ({
        default: m.Plus,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PlusIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiAddLine,
      })),
    iconoir: () => import("iconoir-react/regular/Plus"),
  },
  power: {
    lucide: () => import("lucide-react/dist/esm/icons/power.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconPower.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Power").then((m) => ({
        default: m.Power,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PowerIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiShutDownLine,
      })),
  },
  "power-off": {
    lucide: () => import("lucide-react/dist/esm/icons/power-off.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconPlugOff.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Power").then((m) => ({
        default: m.Power,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PowerIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiShutDownLine,
      })),
  },
  "refresh-ccw": {
    lucide: () => import("lucide-react/dist/esm/icons/refresh-ccw.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconRefresh.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowsCounterClockwise").then(
        (m) => ({
          default: m.ArrowsCounterClockwise,
        }),
      ),
    heroicons: () => import("@heroicons/react/24/outline/ArrowPathIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiResetLeftLine,
      })),
    iconoir: () => import("iconoir-react/regular/RefreshDouble"),
  },
  "refresh-cw": {
    lucide: () => import("lucide-react/dist/esm/icons/refresh-cw.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconRefresh.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowsClockwise").then((m) => ({
        default: m.ArrowsClockwise,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowPathIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiRefreshLine,
      })),
    iconoir: () => import("iconoir-react/regular/Refresh"),
  },
  repeat: {
    lucide: () => import("lucide-react/dist/esm/icons/repeat.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconRepeat.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Repeat").then((m) => ({
        default: m.Repeat,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ArrowPathRoundedSquareIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiRepeatLine,
      })),
    iconoir: () => import("iconoir-react/regular/Repeat"),
  },
  "rotate-ccw": {
    lucide: () => import("lucide-react/dist/esm/icons/rotate-ccw.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconRotate.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowCounterClockwise").then(
        (m) => ({
          default: m.ArrowCounterClockwise,
        }),
      ),
    heroicons: () => import("@heroicons/react/24/outline/ArrowUturnLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiAnticlockwise2Line,
      })),
    iconoir: () => import("iconoir-react/regular/Undo"),
  },
  "rotate-cw": {
    lucide: () => import("lucide-react/dist/esm/icons/rotate-cw.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconRotateClockwise.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowClockwise").then((m) => ({
        default: m.ArrowClockwise,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowUturnRightIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiClockwise2Line,
      })),
    iconoir: () => import("iconoir-react/regular/Redo"),
  },
  rss: {
    lucide: () => import("lucide-react/dist/esm/icons/rss.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconRss.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Rss").then((m) => ({
        default: m.Rss,
      })),
    heroicons: () => import("@heroicons/react/24/outline/RssIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiRssLine,
      })),
    iconoir: () => import("iconoir-react/regular/RssFeed"),
  },
  "scroll-text": {
    lucide: () => import("lucide-react/dist/esm/icons/scroll-text.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconFileText.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Scroll").then((m) => ({
        default: m.Scroll,
      })),
    heroicons: () => import("@heroicons/react/24/outline/DocumentTextIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFileList3Line,
      })),
  },
  search: {
    lucide: () => import("lucide-react/dist/esm/icons/search.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconSearch.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/MagnifyingGlass").then((m) => ({
        default: m.MagnifyingGlass,
      })),
    heroicons: () => import("@heroicons/react/24/outline/MagnifyingGlassIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSearchLine,
      })),
    iconoir: () => import("iconoir-react/regular/Search"),
  },
  send: {
    lucide: () => import("lucide-react/dist/esm/icons/send.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconSend.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/PaperPlaneTilt").then((m) => ({
        default: m.PaperPlaneTilt,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PaperAirplaneIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSendPlaneLine,
      })),
    iconoir: () => import("iconoir-react/regular/Send"),
  },
  server: {
    lucide: () => import("lucide-react/dist/esm/icons/server.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconServer.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/HardDrives").then((m) => ({
        default: m.HardDrives,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ServerIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiServerLine,
      })),
    iconoir: () => import("iconoir-react/regular/Server"),
  },
  settings: {
    lucide: () => import("lucide-react/dist/esm/icons/settings.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconSettings.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Gear").then((m) => ({
        default: m.Gear,
      })),
    heroicons: () => import("@heroicons/react/24/outline/Cog6ToothIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSettingsLine,
      })),
    iconoir: () => import("iconoir-react/regular/Settings"),
  },
  shield: {
    lucide: () => import("lucide-react/dist/esm/icons/shield.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconShield.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Shield").then((m) => ({
        default: m.Shield,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ShieldCheckIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiShieldLine,
      })),
    iconoir: () => import("iconoir-react/regular/Shield"),
  },
  "shield-check": {
    lucide: () => import("lucide-react/dist/esm/icons/shield-check.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconShieldCheck.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ShieldCheck").then((m) => ({
        default: m.ShieldCheck,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ShieldCheckIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiShieldCheckLine,
      })),
    iconoir: () => import("iconoir-react/regular/ShieldCheck"),
  },
  shuffle: {
    lucide: () => import("lucide-react/dist/esm/icons/shuffle.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowsShuffle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Shuffle").then((m) => ({
        default: m.Shuffle,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiShuffleLine,
      })),
    iconoir: () => import("iconoir-react/regular/Shuffle"),
  },
  "sliders-horizontal": {
    lucide: () => import("lucide-react/dist/esm/icons/sliders-horizontal.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconAdjustmentsHorizontal.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SlidersHorizontal").then((m) => ({
        default: m.SlidersHorizontal,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/AdjustmentsHorizontalIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiEqualizerLine,
      })),
  },
  sparkles: {
    lucide: () => import("lucide-react/dist/esm/icons/sparkles.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconSparkles.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Sparkle").then((m) => ({
        default: m.Sparkle,
      })),
    heroicons: () => import("@heroicons/react/24/outline/SparklesIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSparklingLine,
      })),
    iconoir: () => import("iconoir-react/regular/Sparks"),
  },
  sun: {
    lucide: () => import("lucide-react/dist/esm/icons/sun.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconSun.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Sun").then((m) => ({
        default: m.Sun,
      })),
    heroicons: () => import("@heroicons/react/24/outline/SunIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSunLine,
      })),
    iconoir: () => import("iconoir-react/regular/SunLight"),
  },
  tag: {
    lucide: () => import("lucide-react/dist/esm/icons/tag.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconTag.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Tag").then((m) => ({
        default: m.Tag,
      })),
    heroicons: () => import("@heroicons/react/24/outline/TagIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPriceTag3Line,
      })),
    iconoir: () => import("iconoir-react/regular/Label"),
  },
  terminal: {
    lucide: () => import("lucide-react/dist/esm/icons/terminal.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconTerminal2.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Terminal").then((m) => ({
        default: m.Terminal,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CommandLineIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiTerminalLine,
      })),
    iconoir: () => import("iconoir-react/regular/Terminal"),
  },
  trash: {
    lucide: () => import("lucide-react/dist/esm/icons/trash.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconTrash.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Trash").then((m) => ({
        default: m.Trash,
      })),
    heroicons: () => import("@heroicons/react/24/outline/TrashIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDeleteBinLine,
      })),
    iconoir: () => import("iconoir-react/regular/Trash"),
  },
  trophy: {
    lucide: () => import("lucide-react/dist/esm/icons/trophy.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconTrophy.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Trophy").then((m) => ({
        default: m.Trophy,
      })),
    heroicons: () => import("@heroicons/react/24/outline/TrophyIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiTrophyLine,
      })),
    iconoir: () => import("iconoir-react/regular/Trophy"),
  },
  type: {
    lucide: () => import("lucide-react/dist/esm/icons/type.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconTypography.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/TextT").then((m) => ({
        default: m.TextT,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiText,
      })),
    iconoir: () => import("iconoir-react/regular/Type"),
  },
  upload: {
    lucide: () => import("lucide-react/dist/esm/icons/upload.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconUpload.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Upload").then((m) => ({
        default: m.Upload,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowUpTrayIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiUploadLine,
      })),
    iconoir: () => import("iconoir-react/regular/Upload"),
  },
  user: {
    lucide: () => import("lucide-react/dist/esm/icons/user.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconUser.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/User").then((m) => ({
        default: m.User,
      })),
    heroicons: () => import("@heroicons/react/24/outline/UserIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiUserLine,
      })),
    iconoir: () => import("iconoir-react/regular/User"),
  },
  "user-plus": {
    lucide: () => import("lucide-react/dist/esm/icons/user-plus.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconUserPlus.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/UserPlus").then((m) => ({
        default: m.UserPlus,
      })),
    heroicons: () => import("@heroicons/react/24/outline/UserPlusIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiUserAddLine,
      })),
    iconoir: () => import("iconoir-react/regular/UserPlus"),
  },
  users: {
    lucide: () => import("lucide-react/dist/esm/icons/users.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconUsers.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Users").then((m) => ({
        default: m.Users,
      })),
    heroicons: () => import("@heroicons/react/24/outline/UsersIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiGroupLine,
      })),
    iconoir: () => import("iconoir-react/regular/Group"),
  },
  video: {
    lucide: () => import("lucide-react/dist/esm/icons/video.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconVideo.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Video").then((m) => ({
        default: m.Video,
      })),
    heroicons: () => import("@heroicons/react/24/outline/VideoCameraIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiVideoLine,
      })),
    iconoir: () => import("iconoir-react/regular/VideoCamera"),
  },
  wallet: {
    lucide: () => import("lucide-react/dist/esm/icons/wallet.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconWallet.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Wallet").then((m) => ({
        default: m.Wallet,
      })),
    heroicons: () => import("@heroicons/react/24/outline/WalletIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiWalletLine,
      })),
    iconoir: () => import("iconoir-react/regular/Wallet"),
  },
  wand: {
    lucide: () => import("lucide-react/dist/esm/icons/wand.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconWand.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/MagicWand").then((m) => ({
        default: m.MagicWand,
      })),
    heroicons: () => import("@heroicons/react/24/outline/SparklesIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMagicLine,
      })),
    iconoir: () => import("iconoir-react/regular/MagicWand"),
  },
  zap: {
    lucide: () => import("lucide-react/dist/esm/icons/zap.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBolt.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Lightning").then((m) => ({
        default: m.Lightning,
      })),
    heroicons: () => import("@heroicons/react/24/outline/BoltIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFlashlightLine,
      })),
    iconoir: () => import("iconoir-react/regular/Flash"),
  },
  "grid-3x3": {
    lucide: () => import("lucide-react/dist/esm/icons/grid-3-x-3.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconGrid3x3.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/GridNine").then((m) => ({
        default: m.GridNine,
      })),
    heroicons: () => import("@heroicons/react/24/outline/TableCellsIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiGridLine,
      })),
    iconoir: () => import("iconoir-react/regular/ViewGrid"),
  },
  "maximize-2": {
    lucide: () => import("lucide-react/dist/esm/icons/maximize-2.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconMaximize.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowsOutSimple").then((m) => ({
        default: m.ArrowsOutSimple,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ArrowsPointingOutIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiExpandDiagonalLine,
      })),
    iconoir: () => import("iconoir-react/regular/Expand"),
  },
  "settings-2": {
    lucide: () => import("lucide-react/dist/esm/icons/settings-2.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconAdjustments.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SlidersHorizontal").then((m) => ({
        default: m.SlidersHorizontal,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/AdjustmentsHorizontalIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSettings2Line,
      })),
    iconoir: () => import("iconoir-react/regular/Settings"),
  },
  "trash-2": {
    lucide: () => import("lucide-react/dist/esm/icons/trash-2.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconTrash.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Trash").then((m) => ({
        default: m.Trash,
      })),
    heroicons: () => import("@heroicons/react/24/outline/TrashIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDeleteBin2Line,
      })),
    iconoir: () => import("iconoir-react/regular/Trash"),
  },
  "brand-apple": {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.AppleIcon,
      })),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconBrandApple.mjs"),
  },
  "brand-discord": {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.DiscordIcon,
      })),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconBrandDiscord.mjs"),
  },
  "brand-github": {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.GithubIcon,
      })),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconBrandGithub.mjs"),
  },
  "brand-linux": {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.LinuxIcon,
      })),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconBrandUbuntu.mjs"),
  },
  "brand-windows": {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.WindowsIcon,
      })),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconBrandWindows.mjs"),
  },
  "brand-trustpilot": {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.TrustpilotIcon,
      })),
    tabler: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.TrustpilotIcon,
      })),
  },
  "brand-x-twitter": {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.XTwitterIcon,
      })),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBrandX.mjs"),
  },
  "brand-reddit": {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.RedditIcon,
      })),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconBrandReddit.mjs"),
  },
  "brand-youtube": {
    lucide: () =>
      import("@tabler/icons-react/dist/esm/icons/IconBrandYoutube.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconBrandYoutube.mjs"),
  },
  "brand-discord-si": {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.DiscordSiIcon,
      })),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconBrandDiscord.mjs"),
  },
  broom: {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.BroomIcon,
      })),
    tabler: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.BroomIcon,
      })),
  },
  "crab-claw": {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.CrabClawIcon,
      })),
    tabler: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.CrabClawIcon,
      })),
  },
  fox: {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.FoxIcon,
      })),
    tabler: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.FoxIcon,
      })),
  },
  "dots-horizontal": {
    lucide: () =>
      import("@/components/ui/local-icons").then((m) => ({
        default: m.DotsHorizontalIcon,
      })),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconDots.mjs"),
  },
  brain: {
    lucide: () => import("lucide-react/dist/esm/icons/brain.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBrain.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Brain").then((m) => ({
        default: m.Brain,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBrainLine,
      })),
    iconoir: () => import("iconoir-react/regular/Brain"),
  },
  "wifi-off": {
    lucide: () => import("lucide-react/dist/esm/icons/wifi-off.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconWifiOff.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/WifiSlash").then((m) => ({
        default: m.WifiSlash,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiWifiOffLine,
      })),
    iconoir: () => import("iconoir-react/regular/WifiOff"),
  },
  "x-circle": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-x.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCircleX.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/XCircle").then((m) => ({
        default: m.XCircle,
      })),
    heroicons: () => import("@heroicons/react/24/outline/XCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCloseCircleLine,
      })),
    iconoir: () => import("iconoir-react/regular/XmarkCircle"),
  },
  "alert-circle": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-alert.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconAlertCircle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/WarningCircle").then((m) => ({
        default: m.WarningCircle,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ExclamationCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiErrorWarningLine,
      })),
    iconoir: () => import("iconoir-react/regular/WarningCircle"),
  },
  "file-text": {
    lucide: () => import("lucide-react/dist/esm/icons/file-text.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconFileText.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/FileText").then((m) => ({
        default: m.FileText,
      })),
    heroicons: () => import("@heroicons/react/24/outline/DocumentTextIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFileTextLine,
      })),
    iconoir: () => import("iconoir-react/regular/Page"),
  },
  square: {
    lucide: () => import("lucide-react/dist/esm/icons/square.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconSquare.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Square").then((m) => ({
        default: m.Square,
      })),
    heroicons: () => import("@heroicons/react/24/outline/StopIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSquareLine,
      })),
    iconoir: () => import("iconoir-react/regular/Square"),
  },
  wrench: {
    lucide: () => import("lucide-react/dist/esm/icons/wrench.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconTool.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Wrench").then((m) => ({
        default: m.Wrench,
      })),
    heroicons: () => import("@heroicons/react/24/outline/WrenchIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiWrenchLine,
      })),
    iconoir: () => import("iconoir-react/regular/Wrench"),
  },
  list: {
    lucide: () => import("lucide-react/dist/esm/icons/list.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconList.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/List").then((m) => ({
        default: m.List,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ListBulletIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiListUnordered,
      })),
    iconoir: () => import("iconoir-react/regular/List"),
  },
  "plus-circle": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-plus.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconCirclePlus.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/PlusCircle").then((m) => ({
        default: m.PlusCircle,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PlusCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiAddCircleLine,
      })),
    iconoir: () => import("iconoir-react/regular/PlusCircle"),
  },
  "credit-card": {
    lucide: () => import("lucide-react/dist/esm/icons/credit-card.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconCreditCard.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CreditCard").then((m) => ({
        default: m.CreditCard,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CreditCardIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBankCardLine,
      })),
    iconoir: () => import("iconoir-react/regular/CreditCard"),
  },
};

export type IconName = keyof typeof ICON_MAP;
