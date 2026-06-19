import type { IconComponent } from "@/lib/config/vendor-icons";

// Poolside (laguna models). No public mark ships, so this is an inline mono "P" monogram stand-in.
const PoolsideIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Poolside</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5.2 6.5v11h2.1v-3.78h2.66c2.3 0 3.85-1.42 3.85-3.62 0-2.18-1.53-3.6-3.82-3.6H7.2zm2.1 1.76h2.2c1.2 0 1.93.68 1.93 1.84 0 1.17-.73 1.86-1.94 1.86H9.3V8.26z" />
  </svg>
);

export default PoolsideIcon;
