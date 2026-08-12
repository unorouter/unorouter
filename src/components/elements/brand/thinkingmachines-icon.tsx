import type { IconComponent } from "@/lib/config/vendor-registry";

const ThinkingMachinesIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Thinking Machines</title>
    <rect x="4" y="4" width="16" height="16" rx="3" />
  </svg>
);

export default ThinkingMachinesIcon;
