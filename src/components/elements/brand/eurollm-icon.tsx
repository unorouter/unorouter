import type { IconComponent } from "@/lib/config/vendor-icons";

// EuroLLM (utter-project, Horizon Europe). No distributable SVG brand mark, so an
// "E" monogram stand-in.
const EuroLlmIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>EuroLLM</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm6 6v12h9v-2.4h-6.3v-2.45H16v-2.4h-5.3V8.4H17V6H8z" />
  </svg>
);

export default EuroLlmIcon;
