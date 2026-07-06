import type { IconComponent } from "@/lib/config/vendor-icons";

const TheDrummerIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>TheDrummer</title>
    <ellipse cx="12" cy="10.5" rx="8" ry="3" />
    <path d="M4 10.5v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    <path d="M4 13.5c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    <path d="m7 7 5 3.5M21 3l-9 7.5" />
  </svg>
);

export default TheDrummerIcon;
