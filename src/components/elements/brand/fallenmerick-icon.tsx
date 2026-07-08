import type { IconComponent } from "@/lib/config/vendor-icons";

const FallenMerickIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>FallenMerick</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm6.8 17.5h1.78v-3.62h3.92v-1.4h-3.92V9.9h4.32V8.5H8.8v9z" />
  </svg>
);

export default FallenMerickIcon;
