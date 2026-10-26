import type { IconComponent } from "@/lib/config/vendor-registry";

const TeleaiIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>TeleAI</title>
    <ellipse cx="12" cy="12" rx="10" ry="5" />
    <ellipse cx="12" cy="12" rx="4.5" ry="9.5" />
  </svg>
);

export default TeleaiIcon;
