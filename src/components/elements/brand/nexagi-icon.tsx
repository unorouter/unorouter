import type { IconComponent } from "@/lib/config/vendor-icons";

const NexagiIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Nex AGI</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5 6.5v11h2.05v-7.36l5.06 7.36h1.84V6.5h-2.05v7.34L8.82 6.5H7z" />
  </svg>
);

export default NexagiIcon;
