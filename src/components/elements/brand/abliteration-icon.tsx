import type { IconComponent } from "@/lib/config/vendor-registry";

const AbliterationIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Abliteration</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm10 5.5L6 18.5h2.05l1.32-2.98h5.26L15.95 18.5H18L12 5.5zm0 3.9 1.86 4.2h-3.72L12 9.4z" />
  </svg>
);

export default AbliterationIcon;
