import type { IconComponent } from "@/lib/config/vendor-icons";

// Agnes AI (Sapiens AI). No brand mark in any icon pack, so this is an inline
// mono "A" monogram stand-in.
const AgnesBrandIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Agnes AI</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm10 6.2L6.6 17.8h2.02l1.16-2.56h4.44l1.16 2.56h2.02L12 6.2zm0 4.02 1.5 3.32h-3l1.5-3.32z" />
  </svg>
);

export default AgnesBrandIcon;
