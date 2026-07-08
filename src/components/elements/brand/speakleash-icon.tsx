import type { IconComponent } from "@/lib/config/vendor-icons";

const SpeakLeashIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>SpeakLeash</title>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm3.6 7.1c0 1.2-.9 2-2.4 2.2l2.7 3.9h-2l-2.5-3.7h-.7v3.7H8.9V6.7h3.3c2.2 0 3.4 1 3.4 2.4zm-2-.1c0-.6-.5-1-1.4-1h-1.5v2.2h1.5c.9 0 1.4-.4 1.4-1.2z" />
  </svg>
);

export default SpeakLeashIcon;
