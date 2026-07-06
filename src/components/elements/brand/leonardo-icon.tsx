import type { IconComponent } from "@/lib/config/vendor-icons";

const LeonardoIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Leonardo AI</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm6.4 6.5v11h9.2v-1.86h-7.1V6.5H8.4z" />
  </svg>
);

export default LeonardoIcon;
