import type { IconComponent } from "@/lib/config/vendor-icons";

// ElectronHub. No brand mark in any icon pack, so this is an inline mono "E"
// monogram stand-in.
const ElectronHubBrandIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>ElectronHub</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5 6.5v11h8v-1.7H8.9v-3.15h5V11H8.9V8.2H15V6.5H7z" />
  </svg>
);

export default ElectronHubBrandIcon;
