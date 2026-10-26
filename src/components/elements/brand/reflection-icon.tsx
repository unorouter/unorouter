import type { IconComponent } from "@/lib/config/vendor-registry";

const ReflectionIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Reflection AI</title>
    <circle
      cx="6.75"
      cy="12"
      r="4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="17.25" cy="12" r="5.25" />
  </svg>
);

export default ReflectionIcon;
