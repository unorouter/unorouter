import type { IconComponent } from "@/lib/config/vendor-icons";

const PllumIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>PLLuM</title>
    <path d="M3 3h6.5c2.5 0 4 1.4 4 3.6 0 2.3-1.5 3.7-4 3.7H5.4V21H3V3zm2.4 2.1v5.1h3.8c1.3 0 2-.9 2-2.5s-.7-2.6-2-2.6H5.4zM15 3h2.3v15.8H24V21h-9V3z" />
  </svg>
);

export default PllumIcon;
