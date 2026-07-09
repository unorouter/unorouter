import type { IconComponent } from "@/lib/config/vendor-icons";

const RegoloIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Regolo</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm6 5.5v13h2.2v-4.6h2.5l2.6 4.6H18l-2.85-4.98c1.5-.62 2.35-1.9 2.35-3.6 0-2.6-1.9-4.44-4.85-4.44H8zm2.2 1.94h2.15c1.66 0 2.6.9 2.6 2.5s-.94 2.52-2.6 2.52H10.2V7.44z" />
  </svg>
);

export default RegoloIcon;
