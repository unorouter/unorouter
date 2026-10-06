import type { IconComponent } from "@/lib/config/vendor-registry";

const ApodexIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="25 7 460 460"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="none"
    stroke="currentColor"
    strokeWidth={27}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Apodex</title>
    <path d="M49.5 403 279.2 184 460.5 403" />
    <path d="M49.5 403 161.5 206l22 27.5" />
    <path d="M222 282.5 316 403" />
    <path
      d="M199 113.9c38.5 1 55 21.2 55.9 56.1 1.9-34.7 17.9-54.1 56.1-55.9-36.1-.1-56.4-17.1-55.9-56.1-1 38.8-20.5 56.5-56.1 55.9Z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

export default ApodexIcon;
