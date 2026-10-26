import type { IconComponent } from "@/lib/config/vendor-registry";

const VoltropyIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Voltropy</title>
    <path d="M3 4 L12 20 L21 4" />
  </svg>
);

export default VoltropyIcon;
