import type { IconComponent } from "@/lib/config/vendor-icons";

// Requesty. No brand mark in any icon pack, so this is an inline mono "R"
// monogram stand-in.
const RequestyBrandIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Requesty</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5 6.5v11h1.9v-4.1h2.35l2.2 4.1h2.15l-2.45-4.45c1.3-.5 2.05-1.6 2.05-3.15 0-2.15-1.4-3.4-3.8-3.4H7zm1.9 1.7h2.3c1.2 0 1.9.6 1.9 1.7s-.7 1.75-1.9 1.75H8.9V8.2z" />
  </svg>
);

export default RequestyBrandIcon;
