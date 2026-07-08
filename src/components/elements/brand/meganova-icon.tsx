import type { IconComponent } from "@/lib/config/vendor-icons";

const MegaNovaBrandIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>MegaNova</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5 17.5h1.66V11.3l2.62 6.2h1.32l2.62-6.2v6.2H17V8.5h-2.1l-2.86 6.86L9.18 8.5H7v9z" />
  </svg>
);

export default MegaNovaBrandIcon;
