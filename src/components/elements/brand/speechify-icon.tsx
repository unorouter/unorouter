import type { IconComponent } from "@/lib/config/vendor-icons";

const SpeechifyBrandIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Speechify</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm10.3 8.3c-2.1 0-3.6 1.1-3.6 2.8 0 1.5 1 2.2 2.9 2.7 1.4.3 1.8.6 1.8 1.1 0 .6-.5.9-1.4.9-1 0-1.6-.4-1.7-1.2H8.5c.1 1.7 1.5 2.8 3.7 2.8 2.2 0 3.7-1.1 3.7-2.8 0-1.5-.9-2.2-2.9-2.7-1.4-.3-1.8-.6-1.8-1.1 0-.5.5-.8 1.3-.8.9 0 1.4.4 1.5 1.1h1.8c-.1-1.6-1.4-2.7-3.5-2.7z" />
  </svg>
);

export default SpeechifyBrandIcon;
