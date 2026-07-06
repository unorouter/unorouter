import type { IconComponent } from "@/lib/config/vendor-icons";

const NavyAiIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>NavyAI</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5 17.5h1.74V9.83l6.52 7.67h1.74V6.5h-1.74v7.67L8.74 6.5H7v11z" />
  </svg>
);

export default NavyAiIcon;
