import type { IconComponent } from "@/lib/config/vendor-icons";

const JetBrainsIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>JetBrains</title>
    <path d="M2 2h20v20H2V2zm2.6 15.4h6.9v1.15H4.6V17.4zM5.4 6.2l.53-.5c.16.2.33.31.53.31.24 0 .4-.16.4-.5V3.9h.82v1.63c0 .38-.11.66-.31.86-.2.2-.5.3-.87.3-.55 0-.9-.24-1.13-.6zm2.63-2.3h2.75v.72H8.85v.5h1.75v.67H8.85v.52h1.98v.72H8.03V3.9zm3.9.73h-.85V3.9h2.53v.73h-.85v2.13h-.83V4.63z" />
  </svg>
);

export default JetBrainsIcon;
