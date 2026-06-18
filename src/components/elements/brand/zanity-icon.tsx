import type { IconComponent } from "@/lib/config/vendor-icons";

// Zanity. No brand mark in any icon pack, so this is an inline mono "Z" monogram stand-in.
const ZanityBrandIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Zanity</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5 8.5v1.7h5.1L6.7 16v1.5h10.6v-1.7H10l5.4-5.8V8.5H7z" />
  </svg>
);

export default ZanityBrandIcon;
