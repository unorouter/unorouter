import type { IconComponent } from "@/lib/config/vendor-icons";

const GrypheIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Gryphe</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm10.2 17.7c1.7 0 3.1-.62 4-1.74v-3.86h-4.32v1.42h2.66v1.84c-.5.5-1.26.82-2.18.82-2 0-3.32-1.5-3.32-3.94s1.3-3.94 3.24-3.94c1.3 0 2.18.58 2.66 1.74l1.56-.72c-.7-1.66-2.2-2.62-4.22-2.62-2.96 0-5 2.2-5 5.56s2.04 5.56 5.12 5.56z" />
  </svg>
);

export default GrypheIcon;
