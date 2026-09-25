import type { IconComponent } from "@/lib/config/vendor-registry";

const AxonIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 40 40"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Axon Labs</title>
    <path d="M7 31 20 7l13 24h-8l-5-10-5 10z" />
  </svg>
);

export default AxonIcon;
