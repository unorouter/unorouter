import type { IconComponent } from "@/lib/config/vendor-registry";

const DailyIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Daily</title>
    <path d="M10.2 3.5C10.7 2.6 11.6 2 12.6 2h7.2c1.5 0 2.5 1.6 1.8 3L13.8 20.5c-.5.9-1.4 1.5-2.4 1.5H4.2c-1.5 0-2.5-1.6-1.8-3z" />
  </svg>
);

export default DailyIcon;
