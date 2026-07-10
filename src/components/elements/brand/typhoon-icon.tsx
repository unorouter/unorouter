import type { IconComponent } from "@/lib/config/vendor-icons";

const TyphoonIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Typhoon</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm10 4.8c-1.9 0-3.6.7-4.9 1.9 1-.5 2.1-.8 3.3-.8 3.6 0 6.5 2.6 6.5 5.9 0 2-1.6 3.6-3.6 3.6-1.4 0-2.6-1-2.6-2.4 0-1 .8-1.8 1.8-1.8.5 0 .9.2 1.2.5a1 1 0 0 1-.9-.5c-.4 0-.7.3-.7.8 0 .7.7 1.3 1.6 1.3 1.3 0 2.4-1.1 2.4-2.5 0-2.3-2.1-4.1-4.9-4.1-3.4 0-6.2 2.6-6.2 5.7 0 .5.1 1 .2 1.4A7.2 7.2 0 0 1 12 4.8z" />
  </svg>
);

export default TyphoonIcon;
