    // Per-icon dynamic loaders; each enters the chunk graph on first render, missing key falls back to lucide. GENERATED; edit the script.

export type IconLibraryName =
  | "lucide"
  | "tabler"
  | "phosphor"
  | "heroicons"
  | "remix"
  | "iconoir";

export type IconComponent = React.ComponentType<
  React.SVGAttributes<SVGElement> & { size?: number | string }
>;

export type IconLoader = () => Promise<{ default: IconComponent }>;

type IconEntry = Partial<Record<IconLibraryName, IconLoader>>;

export const ICON_MAP: Record<string, IconEntry> = {
  "arrow-down": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-down.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowDown.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowDown").then((m) => ({
        default: m.ArrowDown as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowDownIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowDownLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowDown"),
  },
  "arrow-down-right": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-down-right.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowDownRight.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowDownRight").then((m) => ({
        default: m.ArrowDownRight as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowDownRightIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowRightDownLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowDownRight"),
  },
  "arrow-left": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-left.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowLeft.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowLeft").then((m) => ({
        default: m.ArrowLeft as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowLeftLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowLeft"),
  },
  "arrow-left-right": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-left-right.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowsLeftRight.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowsLeftRight").then((m) => ({
        default: m.ArrowsLeftRight as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowsRightLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowLeftRightLine as unknown as IconComponent,
      })),
  },
  "arrow-right": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-right.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowRight.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowRight").then((m) => ({
        default: m.ArrowRight as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowRightIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowRightLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowRight"),
  },
  "arrow-right-left": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-right-left.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowsRightLeft.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowsLeftRight").then((m) => ({
        default: m.ArrowsLeftRight as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowsRightLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowLeftRightLine as unknown as IconComponent,
      })),
  },
  "arrow-up": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-up.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconArrowUp.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowUp").then((m) => ({
        default: m.ArrowUp as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowUpIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowUpLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowUp"),
  },
  "arrow-up-down": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-up-down.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowsUpDown.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowsDownUp").then((m) => ({
        default: m.ArrowsDownUp as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowsUpDownIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowUpDownLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/DataTransferBoth"),
  },
  "arrow-up-right": {
    lucide: () => import("lucide-react/dist/esm/icons/arrow-up-right.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowUpRight.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowUpRight").then((m) => ({
        default: m.ArrowUpRight as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowUpRightIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowRightUpLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowUpRight"),
  },
  "chevron-down": {
    lucide: () => import("lucide-react/dist/esm/icons/chevron-down.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChevronDown.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CaretDown").then((m) => ({
        default: m.CaretDown as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChevronDownIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowDownSLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/NavArrowDown"),
  },
  "chevron-left": {
    lucide: () => import("lucide-react/dist/esm/icons/chevron-left.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChevronLeft.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CaretLeft").then((m) => ({
        default: m.CaretLeft as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChevronLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowLeftSLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/NavArrowLeft"),
  },
  "chevron-right": {
    lucide: () => import("lucide-react/dist/esm/icons/chevron-right.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChevronRight.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CaretRight").then((m) => ({
        default: m.CaretRight as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChevronRightIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowRightSLine as unknown as IconComponent,
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
          default: m.ArrowsInLineVertical as IconComponent,
        }),
      ),
    heroicons: () => import("@heroicons/react/24/outline/ChevronUpDownIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiContractUpDownLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowUnionVertical"),
  },
  "chevrons-left": {
    lucide: () => import("lucide-react/dist/esm/icons/chevrons-left.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChevronsLeft.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CaretDoubleLeft").then((m) => ({
        default: m.CaretDoubleLeft as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ChevronDoubleLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowLeftDoubleLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/FastArrowLeft"),
  },
  "chevrons-right": {
    lucide: () => import("lucide-react/dist/esm/icons/chevrons-right.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChevronsRight.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CaretDoubleRight").then((m) => ({
        default: m.CaretDoubleRight as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ChevronDoubleRightIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiArrowRightDoubleLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/FastArrowRight"),
  },
  "chevrons-up-down": {
    lucide: () => import("lucide-react/dist/esm/icons/chevrons-up-down.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChevronsUp.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CaretUpDown").then((m) => ({
        default: m.CaretUpDown as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChevronUpDownIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiExpandUpDownLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ArrowSeparateVertical"),
  },
  activity: {
    lucide: () => import("lucide-react/dist/esm/icons/activity.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconActivity.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Pulse").then((m) => ({
        default: m.Pulse as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/SignalIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPulseLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Activity"),
  },
  check: {
    lucide: () => import("lucide-react/dist/esm/icons/check.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCheck.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Check").then((m) => ({
        default: m.Check as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CheckIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCheckLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Check"),
  },
  "circle-alert": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-alert.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconAlertCircle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/WarningCircle").then((m) => ({
        default: m.WarningCircle as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ExclamationCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiErrorWarningLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/WarningCircle"),
  },
  "circle-check": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-check.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconCircleCheck.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CheckCircle").then((m) => ({
        default: m.CheckCircle as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CheckCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCheckboxCircleLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/CheckCircle"),
  },
  "circle-help": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-help.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconHelpCircle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Question").then((m) => ({
        default: m.Question as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/QuestionMarkCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiQuestionLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/HelpCircle"),
  },
  "circle-x": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-x.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCircleX.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/XCircle").then((m) => ({
        default: m.XCircle as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/XCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCloseCircleLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/XmarkCircle"),
  },
  "triangle-alert": {
    lucide: () => import("lucide-react/dist/esm/icons/triangle-alert.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconAlertTriangle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Warning").then((m) => ({
        default: m.Warning as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ExclamationTriangleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiAlertLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/WarningTriangle"),
  },
  "octagon-x": {
    lucide: () => import("lucide-react/dist/esm/icons/octagon-x.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconOctagon.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Prohibit").then((m) => ({
        default: m.Prohibit as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/NoSymbolIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiForbidLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Prohibition"),
  },
  info: {
    lucide: () => import("lucide-react/dist/esm/icons/info.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconInfoCircle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Info").then((m) => ({
        default: m.Info as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/InformationCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiInformationLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/InfoCircle"),
  },
  loader: {
    lucide: () => import("lucide-react/dist/esm/icons/loader.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconLoader.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Spinner").then((m) => ({
        default: m.Spinner as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowPathIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLoaderLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/RefreshDouble"),
  },
  x: {
    lucide: () => import("lucide-react/dist/esm/icons/x.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconX.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/X").then((m) => ({
        default: m.X as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/XMarkIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCloseLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Xmark"),
  },
  "chart-bar": {
    lucide: () => import("lucide-react/dist/esm/icons/chart-bar.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconChartBar.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ChartBar").then((m) => ({
        default: m.ChartBar as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChartBarIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBarChartHorizontalLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/StatsReport"),
  },
  "chart-column": {
    lucide: () => import("lucide-react/dist/esm/icons/chart-column.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChartColumn.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ChartBar").then((m) => ({
        default: m.ChartBar as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChartBarIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBarChartLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/StatsUpSquare"),
  },
  "chart-column-big": {
    lucide: () => import("lucide-react/dist/esm/icons/chart-column-big.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconChartColumn.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ChartBar").then((m) => ({
        default: m.ChartBar as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChartBarIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBarChart2Line as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/StatsUpSquare"),
  },
  "chart-pie": {
    lucide: () => import("lucide-react/dist/esm/icons/chart-pie.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconChartPie.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ChartPie").then((m) => ({
        default: m.ChartPie as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChartPieIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPieChartLine as unknown as IconComponent,
      })),
  },
  "trending-down": {
    lucide: () => import("lucide-react/dist/esm/icons/trending-down.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconTrendingDown.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/TrendDown").then((m) => ({
        default: m.TrendDown as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ArrowTrendingDownIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiStockLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/GraphDown"),
  },
  "trending-up": {
    lucide: () => import("lucide-react/dist/esm/icons/trending-up.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconTrendingUp.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/TrendUp").then((m) => ({
        default: m.TrendUp as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowTrendingUpIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLineChartLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/GraphUp"),
  },
  gauge: {
    lucide: () => import("lucide-react/dist/esm/icons/gauge.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconGauge.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Gauge").then((m) => ({
        default: m.Gauge as IconComponent,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDashboard3Line as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/DashboardSpeed"),
  },
  bell: {
    lucide: () => import("lucide-react/dist/esm/icons/bell.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBell.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Bell").then((m) => ({
        default: m.Bell as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/BellIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBellLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Bell"),
  },
  binary: {
    lucide: () => import("lucide-react/dist/esm/icons/binary.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBinary.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Binary").then((m) => ({
        default: m.Binary as IconComponent,
      })),
  },
  "book-open": {
    lucide: () => import("lucide-react/dist/esm/icons/book-open.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBook.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/BookOpen").then((m) => ({
        default: m.BookOpen as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/BookOpenIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBookOpenLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/OpenBook"),
  },
  "book-text": {
    lucide: () => import("lucide-react/dist/esm/icons/book-text.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBook.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/BookOpenText").then((m) => ({
        default: m.BookOpenText as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/BookOpenIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBookOpenLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/OpenBook"),
  },
  calendar: {
    lucide: () => import("lucide-react/dist/esm/icons/calendar.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCalendar.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Calendar").then((m) => ({
        default: m.Calendar as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CalendarIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCalendarLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Calendar"),
  },
  "clipboard-copy": {
    lucide: () => import("lucide-react/dist/esm/icons/clipboard-copy.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconClipboardCopy.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ClipboardText").then((m) => ({
        default: m.ClipboardText as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ClipboardDocumentIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiClipboardLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/PasteClipboard"),
  },
  "cloud-off": {
    lucide: () => import("lucide-react/dist/esm/icons/cloud-off.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCloudOff.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CloudSlash").then((m) => ({
        default: m.CloudSlash as IconComponent,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCloudOffLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/CloudXmark"),
  },
  "cloud-upload": {
    lucide: () => import("lucide-react/dist/esm/icons/cloud-upload.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconCloudUpload.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CloudArrowUp").then((m) => ({
        default: m.CloudArrowUp as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CloudArrowUpIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiUploadCloud2Line as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/CloudUpload"),
  },
  clock: {
    lucide: () => import("lucide-react/dist/esm/icons/clock.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconClock.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Clock").then((m) => ({
        default: m.Clock as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ClockIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiTimeLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Clock"),
  },
  code: {
    lucide: () => import("lucide-react/dist/esm/icons/code.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCode.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Code").then((m) => ({
        default: m.Code as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CodeBracketIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCodeLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Code"),
  },
  copy: {
    lucide: () => import("lucide-react/dist/esm/icons/copy.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCopy.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Copy").then((m) => ({
        default: m.Copy as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/DocumentDuplicateIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFileCopyLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Copy"),
  },
  cpu: {
    lucide: () => import("lucide-react/dist/esm/icons/cpu.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCpu.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Cpu").then((m) => ({
        default: m.Cpu as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CpuChipIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCpuLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Cpu"),
  },
  database: {
    lucide: () => import("lucide-react/dist/esm/icons/database.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconDatabase.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Database").then((m) => ({
        default: m.Database as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CircleStackIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDatabaseLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Database"),
  },
  dices: {
    lucide: () => import("lucide-react/dist/esm/icons/dices.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconDice.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/DiceFive").then((m) => ({
        default: m.DiceFive as IconComponent,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDiceLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/DiceFive"),
  },
  "dollar-sign": {
    lucide: () => import("lucide-react/dist/esm/icons/dollar-sign.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconCurrencyDollar.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CurrencyDollar").then((m) => ({
        default: m.CurrencyDollar as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CurrencyDollarIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMoneyDollarCircleLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Dollar"),
  },
  download: {
    lucide: () => import("lucide-react/dist/esm/icons/download.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconDownload.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Download").then((m) => ({
        default: m.Download as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowDownTrayIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDownloadLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Download"),
  },
  drama: {
    lucide: () => import("lucide-react/dist/esm/icons/drama.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconMasksTheater.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/MaskHappy").then((m) => ({
        default: m.MaskHappy as IconComponent,
      })),
  },
  ellipsis: {
    lucide: () => import("lucide-react/dist/esm/icons/ellipsis.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconDots.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/DotsThree").then((m) => ({
        default: m.DotsThree as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/EllipsisHorizontalIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMoreLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/MoreHoriz"),
  },
  "ellipsis-vertical": {
    lucide: () => import("lucide-react/dist/esm/icons/ellipsis-vertical.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconDotsVertical.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/DotsThreeVertical").then((m) => ({
        default: m.DotsThreeVertical as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/EllipsisVerticalIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMore2Line as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/MoreVert"),
  },
  eraser: {
    lucide: () => import("lucide-react/dist/esm/icons/eraser.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconEraser.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Eraser").then((m) => ({
        default: m.Eraser as IconComponent,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiEraserLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Erase"),
  },
  "external-link": {
    lucide: () => import("lucide-react/dist/esm/icons/external-link.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconExternalLink.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowSquareOut").then((m) => ({
        default: m.ArrowSquareOut as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ArrowTopRightOnSquareIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiExternalLinkLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/OpenNewWindow"),
  },
  eye: {
    lucide: () => import("lucide-react/dist/esm/icons/eye.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconEye.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Eye").then((m) => ({
        default: m.Eye as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/EyeIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiEyeLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Eye"),
  },
  "eye-off": {
    lucide: () => import("lucide-react/dist/esm/icons/eye-off.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconEyeOff.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/EyeSlash").then((m) => ({
        default: m.EyeSlash as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/EyeSlashIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiEyeOffLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/EyeClosed"),
  },
  file: {
    lucide: () => import("lucide-react/dist/esm/icons/file.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconFile.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/File").then((m) => ({
        default: m.File as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/DocumentIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFileLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Page"),
  },
  "file-question": {
    lucide: () => import("lucide-react/dist/esm/icons/file-question.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconFileUnknown.mjs"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFileUnknowLine as unknown as IconComponent,
      })),
  },
  filter: {
    lucide: () => import("lucide-react/dist/esm/icons/filter.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconFilter.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/FunnelSimple").then((m) => ({
        default: m.FunnelSimple as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/FunnelIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFilterLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Filter"),
  },
  fingerprint: {
    lucide: () => import("lucide-react/dist/esm/icons/fingerprint-pattern.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconFingerprint.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Fingerprint").then((m) => ({
        default: m.Fingerprint as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/FingerPrintIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFingerprintLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Fingerprint"),
  },
  gift: {
    lucide: () => import("lucide-react/dist/esm/icons/gift.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconGift.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Gift").then((m) => ({
        default: m.Gift as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/GiftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiGiftLine as unknown as IconComponent,
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
        default: m.GithubLogo as IconComponent,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiGithubLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Github"),
  },
  globe: {
    lucide: () => import("lucide-react/dist/esm/icons/globe.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconWorld.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Globe").then((m) => ({
        default: m.Globe as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/GlobeAltIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiGlobeLine as unknown as IconComponent,
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
        default: m.GridFour as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/Squares2X2Icon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLayoutGridLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ViewGrid"),
  },
  "grip-vertical": {
    lucide: () => import("lucide-react/dist/esm/icons/grip-vertical.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconGripVertical.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/DotsSixVertical").then((m) => ({
        default: m.DotsSixVertical as IconComponent,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDraggable as unknown as IconComponent,
      })),
  },
  hash: {
    lucide: () => import("lucide-react/dist/esm/icons/hash.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconHash.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Hash").then((m) => ({
        default: m.Hash as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/HashtagIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiHashtag as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Hashtag"),
  },
  heart: {
    lucide: () => import("lucide-react/dist/esm/icons/heart.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconHeart.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Heart").then((m) => ({
        default: m.Heart as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/HeartIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiHeartLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Heart"),
  },
  "heart-pulse": {
    lucide: () => import("lucide-react/dist/esm/icons/heart-pulse.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconHeartbeat.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Heartbeat").then((m) => ({
        default: m.Heartbeat as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/HeartIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiHeartPulseLine as unknown as IconComponent,
      })),
  },
  house: {
    lucide: () => import("lucide-react/dist/esm/icons/house.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconHome.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/House").then((m) => ({
        default: m.House as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/HomeIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiHome4Line as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Home"),
  },
  image: {
    lucide: () => import("lucide-react/dist/esm/icons/image.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconPhoto.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Image").then((m) => ({
        default: m.Image as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PhotoIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiImageLine as unknown as IconComponent,
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
        default: m.Key as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/KeyIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiKeyLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Key"),
  },
  "key-round": {
    lucide: () => import("lucide-react/dist/esm/icons/key-round.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconKey.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Key").then((m) => ({
        default: m.Key as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/KeyIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiKey2Line as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Key"),
  },
  layers: {
    lucide: () => import("lucide-react/dist/esm/icons/layers.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconStack2.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Stack").then((m) => ({
        default: m.Stack as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/Square3Stack3DIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiStackLine as unknown as IconComponent,
      })),
  },
  "layout-dashboard": {
    lucide: () => import("lucide-react/dist/esm/icons/layout-dashboard.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconLayoutDashboard.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SquaresFour").then((m) => ({
        default: m.SquaresFour as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/Squares2X2Icon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDashboardLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Dashboard"),
  },
  "layout-grid": {
    lucide: () => import("lucide-react/dist/esm/icons/layout-grid.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconLayoutGrid.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SquaresFour").then((m) => ({
        default: m.SquaresFour as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/Squares2X2Icon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLayoutGridLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ViewGrid"),
  },
  link: {
    lucide: () => import("lucide-react/dist/esm/icons/link.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconLink.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Link").then((m) => ({
        default: m.Link as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/LinkIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLink as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Link"),
  },
  lock: {
    lucide: () => import("lucide-react/dist/esm/icons/lock.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconLock.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Lock").then((m) => ({
        default: m.Lock as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/LockClosedIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLockLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Lock"),
  },
  "log-in": {
    lucide: () => import("lucide-react/dist/esm/icons/log-in.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconLogin.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SignIn").then((m) => ({
        default: m.SignIn as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ArrowRightEndOnRectangleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLoginBoxLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/LogIn"),
  },
  "log-out": {
    lucide: () => import("lucide-react/dist/esm/icons/log-out.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconLogout.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SignOut").then((m) => ({
        default: m.SignOut as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ArrowRightStartOnRectangleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLogoutBoxLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/LogOut"),
  },
  mail: {
    lucide: () => import("lucide-react/dist/esm/icons/mail.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconMail.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/EnvelopeSimple").then((m) => ({
        default: m.EnvelopeSimple as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/EnvelopeIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMailLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Mail"),
  },
  menu: {
    lucide: () => import("lucide-react/dist/esm/icons/menu.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconMenu2.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/List").then((m) => ({
        default: m.List as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/Bars3Icon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMenuLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Menu"),
  },
  "message-circle": {
    lucide: () => import("lucide-react/dist/esm/icons/message-circle.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconMessageCircle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ChatCircle").then((m) => ({
        default: m.ChatCircle as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ChatBubbleOvalLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiChat1Line as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ChatBubbleEmpty"),
  },
  "message-square": {
    lucide: () => import("lucide-react/dist/esm/icons/message-square.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconMessage.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Chat").then((m) => ({
        default: m.Chat as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ChatBubbleLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiChat4Line as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ChatLines"),
  },
  mic: {
    lucide: () => import("lucide-react/dist/esm/icons/mic.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconMicrophone.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Microphone").then((m) => ({
        default: m.Microphone as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/MicrophoneIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMicLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Microphone"),
  },
  monitor: {
    lucide: () => import("lucide-react/dist/esm/icons/monitor.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconDeviceDesktop.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Monitor").then((m) => ({
        default: m.Monitor as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ComputerDesktopIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiComputerLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Computer"),
  },
  moon: {
    lucide: () => import("lucide-react/dist/esm/icons/moon.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconMoon.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Moon").then((m) => ({
        default: m.Moon as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/MoonIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMoonLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/HalfMoon"),
  },
  music: {
    lucide: () => import("lucide-react/dist/esm/icons/music.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconMusic.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/MusicNotes").then((m) => ({
        default: m.MusicNotes as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/MusicalNoteIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMusicLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/MusicDoubleNote"),
  },
  newspaper: {
    lucide: () => import("lucide-react/dist/esm/icons/newspaper.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconNews.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Newspaper").then((m) => ({
        default: m.Newspaper as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/NewspaperIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiNewspaperLine as unknown as IconComponent,
      })),
  },
  paintbrush: {
    lucide: () => import("lucide-react/dist/esm/icons/paintbrush.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBrush.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/PaintBrush").then((m) => ({
        default: m.PaintBrush as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PaintBrushIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBrushLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Palette"),
  },
  "panel-left": {
    lucide: () => import("lucide-react/dist/esm/icons/panel-left.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconLayoutSidebar.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SidebarSimple").then((m) => ({
        default: m.SidebarSimple as IconComponent,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiLayoutLeftLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/SidebarCollapse"),
  },
  pencil: {
    lucide: () => import("lucide-react/dist/esm/icons/pencil.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconPencil.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Pencil").then((m) => ({
        default: m.Pencil as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PencilIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPencilLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/EditPencil"),
  },
  "pencil-ruler": {
    lucide: () => import("lucide-react/dist/esm/icons/pencil-ruler.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconRulerMeasure.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/PencilRuler").then((m) => ({
        default: m.PencilRuler as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PencilSquareIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPencilRulerLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/DesignPencil"),
  },
  percent: {
    lucide: () => import("lucide-react/dist/esm/icons/percent.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconPercentage.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Percent").then((m) => ({
        default: m.Percent as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PercentBadgeIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPercentLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Percentage"),
  },
  play: {
    lucide: () => import("lucide-react/dist/esm/icons/play.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconPlayerPlay.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Play").then((m) => ({
        default: m.Play as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PlayIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPlayLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Play"),
  },
  plus: {
    lucide: () => import("lucide-react/dist/esm/icons/plus.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconPlus.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Plus").then((m) => ({
        default: m.Plus as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PlusIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiAddLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Plus"),
  },
  power: {
    lucide: () => import("lucide-react/dist/esm/icons/power.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconPower.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Power").then((m) => ({
        default: m.Power as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PowerIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiShutDownLine as unknown as IconComponent,
      })),
  },
  "power-off": {
    lucide: () => import("lucide-react/dist/esm/icons/power-off.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconPlugOff.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Power").then((m) => ({
        default: m.Power as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PowerIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiShutDownLine as unknown as IconComponent,
      })),
  },
  "refresh-ccw": {
    lucide: () => import("lucide-react/dist/esm/icons/refresh-ccw.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconRefresh.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowsCounterClockwise").then(
        (m) => ({
          default: m.ArrowsCounterClockwise as IconComponent,
        }),
      ),
    heroicons: () => import("@heroicons/react/24/outline/ArrowPathIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiResetLeftLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/RefreshDouble"),
  },
  "refresh-cw": {
    lucide: () => import("lucide-react/dist/esm/icons/refresh-cw.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconRefresh.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowsClockwise").then((m) => ({
        default: m.ArrowsClockwise as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowPathIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiRefreshLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Refresh"),
  },
  repeat: {
    lucide: () => import("lucide-react/dist/esm/icons/repeat.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconRepeat.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Repeat").then((m) => ({
        default: m.Repeat as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ArrowPathRoundedSquareIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiRepeatLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Repeat"),
  },
  "rotate-ccw": {
    lucide: () => import("lucide-react/dist/esm/icons/rotate-ccw.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconRotate.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowCounterClockwise").then(
        (m) => ({
          default: m.ArrowCounterClockwise as IconComponent,
        }),
      ),
    heroicons: () => import("@heroicons/react/24/outline/ArrowUturnLeftIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiAnticlockwise2Line as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Undo"),
  },
  "rotate-cw": {
    lucide: () => import("lucide-react/dist/esm/icons/rotate-cw.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconRotateClockwise.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowClockwise").then((m) => ({
        default: m.ArrowClockwise as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowUturnRightIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiClockwise2Line as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Redo"),
  },
  rss: {
    lucide: () => import("lucide-react/dist/esm/icons/rss.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconRss.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Rss").then((m) => ({
        default: m.Rss as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/RssIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiRssLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/RssFeed"),
  },
  "scroll-text": {
    lucide: () => import("lucide-react/dist/esm/icons/scroll-text.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconFileText.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Scroll").then((m) => ({
        default: m.Scroll as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/DocumentTextIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFileList3Line as unknown as IconComponent,
      })),
  },
  search: {
    lucide: () => import("lucide-react/dist/esm/icons/search.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconSearch.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/MagnifyingGlass").then((m) => ({
        default: m.MagnifyingGlass as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/MagnifyingGlassIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSearchLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Search"),
  },
  send: {
    lucide: () => import("lucide-react/dist/esm/icons/send.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconSend.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/PaperPlaneTilt").then((m) => ({
        default: m.PaperPlaneTilt as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PaperAirplaneIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSendPlaneLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Send"),
  },
  server: {
    lucide: () => import("lucide-react/dist/esm/icons/server.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconServer.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/HardDrives").then((m) => ({
        default: m.HardDrives as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ServerIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiServerLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Server"),
  },
  settings: {
    lucide: () => import("lucide-react/dist/esm/icons/settings.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconSettings.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Gear").then((m) => ({
        default: m.Gear as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/Cog6ToothIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSettingsLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Settings"),
  },
  shield: {
    lucide: () => import("lucide-react/dist/esm/icons/shield.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconShield.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Shield").then((m) => ({
        default: m.Shield as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ShieldCheckIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiShieldLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Shield"),
  },
  "shield-check": {
    lucide: () => import("lucide-react/dist/esm/icons/shield-check.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconShieldCheck.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ShieldCheck").then((m) => ({
        default: m.ShieldCheck as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ShieldCheckIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiShieldCheckLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ShieldCheck"),
  },
  shuffle: {
    lucide: () => import("lucide-react/dist/esm/icons/shuffle.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconArrowsShuffle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Shuffle").then((m) => ({
        default: m.Shuffle as IconComponent,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiShuffleLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Shuffle"),
  },
  "sliders-horizontal": {
    lucide: () => import("lucide-react/dist/esm/icons/sliders-horizontal.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconAdjustmentsHorizontal.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SlidersHorizontal").then((m) => ({
        default: m.SlidersHorizontal as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/AdjustmentsHorizontalIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiEqualizerLine as unknown as IconComponent,
      })),
  },
  sparkles: {
    lucide: () => import("lucide-react/dist/esm/icons/sparkles.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconSparkles.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Sparkle").then((m) => ({
        default: m.Sparkle as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/SparklesIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSparklingLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Sparks"),
  },
  sun: {
    lucide: () => import("lucide-react/dist/esm/icons/sun.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconSun.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Sun").then((m) => ({
        default: m.Sun as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/SunIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSunLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/SunLight"),
  },
  tag: {
    lucide: () => import("lucide-react/dist/esm/icons/tag.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconTag.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Tag").then((m) => ({
        default: m.Tag as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/TagIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiPriceTag3Line as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Label"),
  },
  terminal: {
    lucide: () => import("lucide-react/dist/esm/icons/terminal.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconTerminal2.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Terminal").then((m) => ({
        default: m.Terminal as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CommandLineIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiTerminalLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Terminal"),
  },
  trash: {
    lucide: () => import("lucide-react/dist/esm/icons/trash.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconTrash.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Trash").then((m) => ({
        default: m.Trash as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/TrashIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDeleteBinLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Trash"),
  },
  trophy: {
    lucide: () => import("lucide-react/dist/esm/icons/trophy.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconTrophy.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Trophy").then((m) => ({
        default: m.Trophy as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/TrophyIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiTrophyLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Trophy"),
  },
  type: {
    lucide: () => import("lucide-react/dist/esm/icons/type.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconTypography.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/TextT").then((m) => ({
        default: m.TextT as IconComponent,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiText as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Type"),
  },
  upload: {
    lucide: () => import("lucide-react/dist/esm/icons/upload.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconUpload.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Upload").then((m) => ({
        default: m.Upload as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ArrowUpTrayIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiUploadLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Upload"),
  },
  user: {
    lucide: () => import("lucide-react/dist/esm/icons/user.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconUser.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/User").then((m) => ({
        default: m.User as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/UserIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiUserLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/User"),
  },
  "user-plus": {
    lucide: () => import("lucide-react/dist/esm/icons/user-plus.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconUserPlus.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/UserPlus").then((m) => ({
        default: m.UserPlus as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/UserPlusIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiUserAddLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/UserPlus"),
  },
  users: {
    lucide: () => import("lucide-react/dist/esm/icons/users.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconUsers.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Users").then((m) => ({
        default: m.Users as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/UsersIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiGroupLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Group"),
  },
  video: {
    lucide: () => import("lucide-react/dist/esm/icons/video.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconVideo.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Video").then((m) => ({
        default: m.Video as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/VideoCameraIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiVideoLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/VideoCamera"),
  },
  wallet: {
    lucide: () => import("lucide-react/dist/esm/icons/wallet.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconWallet.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Wallet").then((m) => ({
        default: m.Wallet as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/WalletIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiWalletLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Wallet"),
  },
  wand: {
    lucide: () => import("lucide-react/dist/esm/icons/wand.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconWand.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/MagicWand").then((m) => ({
        default: m.MagicWand as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/SparklesIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiMagicLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/MagicWand"),
  },
  zap: {
    lucide: () => import("lucide-react/dist/esm/icons/zap.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconBolt.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Lightning").then((m) => ({
        default: m.Lightning as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/BoltIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFlashlightLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Flash"),
  },
  "grid-3x3": {
    lucide: () => import("lucide-react/dist/esm/icons/grid-3-x-3.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconGrid3x3.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/GridNine").then((m) => ({
        default: m.GridNine as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/TableCellsIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiGridLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/ViewGrid"),
  },
  "maximize-2": {
    lucide: () => import("lucide-react/dist/esm/icons/maximize-2.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconMaximize.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/ArrowsOutSimple").then((m) => ({
        default: m.ArrowsOutSimple as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ArrowsPointingOutIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiExpandDiagonalLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Expand"),
  },
  "settings-2": {
    lucide: () => import("lucide-react/dist/esm/icons/settings-2.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconAdjustments.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/SlidersHorizontal").then((m) => ({
        default: m.SlidersHorizontal as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/AdjustmentsHorizontalIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSettings2Line as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Settings"),
  },
  "trash-2": {
    lucide: () => import("lucide-react/dist/esm/icons/trash-2.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconTrash.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Trash").then((m) => ({
        default: m.Trash as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/TrashIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiDeleteBin2Line as unknown as IconComponent,
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
        default: m.Brain as IconComponent,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBrainLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Brain"),
  },
  "wifi-off": {
    lucide: () => import("lucide-react/dist/esm/icons/wifi-off.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconWifiOff.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/WifiSlash").then((m) => ({
        default: m.WifiSlash as IconComponent,
      })),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiWifiOffLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/WifiOff"),
  },
  "x-circle": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-x.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconCircleX.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/XCircle").then((m) => ({
        default: m.XCircle as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/XCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiCloseCircleLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/XmarkCircle"),
  },
  "alert-circle": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-alert.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconAlertCircle.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/WarningCircle").then((m) => ({
        default: m.WarningCircle as IconComponent,
      })),
    heroicons: () =>
      import("@heroicons/react/24/outline/ExclamationCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiErrorWarningLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/WarningCircle"),
  },
  "file-text": {
    lucide: () => import("lucide-react/dist/esm/icons/file-text.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconFileText.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/FileText").then((m) => ({
        default: m.FileText as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/DocumentTextIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiFileTextLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Page"),
  },
  square: {
    lucide: () => import("lucide-react/dist/esm/icons/square.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconSquare.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Square").then((m) => ({
        default: m.Square as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/StopIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiSquareLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Square"),
  },
  wrench: {
    lucide: () => import("lucide-react/dist/esm/icons/wrench.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconTool.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/Wrench").then((m) => ({
        default: m.Wrench as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/WrenchIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiWrenchLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/Wrench"),
  },
  list: {
    lucide: () => import("lucide-react/dist/esm/icons/list.mjs"),
    tabler: () => import("@tabler/icons-react/dist/esm/icons/IconList.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/List").then((m) => ({
        default: m.List as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/ListBulletIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiListUnordered as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/List"),
  },
  "plus-circle": {
    lucide: () => import("lucide-react/dist/esm/icons/circle-plus.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconCirclePlus.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/PlusCircle").then((m) => ({
        default: m.PlusCircle as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/PlusCircleIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiAddCircleLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/PlusCircle"),
  },
  "credit-card": {
    lucide: () => import("lucide-react/dist/esm/icons/credit-card.mjs"),
    tabler: () =>
      import("@tabler/icons-react/dist/esm/icons/IconCreditCard.mjs"),
    phosphor: () =>
      import("@phosphor-icons/react/dist/ssr/CreditCard").then((m) => ({
        default: m.CreditCard as IconComponent,
      })),
    heroicons: () => import("@heroicons/react/24/outline/CreditCardIcon"),
    remix: () =>
      import("@remixicon/react").then((m) => ({
        default: m.RiBankCardLine as unknown as IconComponent,
      })),
    iconoir: () => import("iconoir-react/regular/CreditCard"),
  },
};

export type IconName = keyof typeof ICON_MAP;
