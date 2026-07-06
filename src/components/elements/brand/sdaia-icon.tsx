import type { IconComponent } from "@/lib/config/vendor-icons";

const SdaiaIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>SDAIA</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm2.4 17.5h2.04l.78-2.2h3.86l.78 2.2h2.08L10.6 6.5H8.2L4.4 17.5zm4.78-8.42 1.34 3.78H7.84l1.34-3.78zM15.2 17.5h5.16v-1.78h-3.2V6.5H15.2v11z" />
  </svg>
);

export default SdaiaIcon;
