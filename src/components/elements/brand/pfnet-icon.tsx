import type { IconComponent } from "@/lib/config/vendor-icons";

// Preferred Networks (plamo embedding model). No mark ships in @lobehub/icons or
// react-icons, so this is an inline mono monogram ("PFN") stand-in.
const PfnetIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Preferred Networks</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm2.6 6.5v11h1.96v-3.7h1.78c2.06 0 3.42-1.46 3.42-3.66 0-2.18-1.34-3.64-3.4-3.64H4.6zm1.96 1.78h1.46c1.02 0 1.66.72 1.66 1.86 0 1.16-.64 1.88-1.68 1.88H6.56V8.28zm6.48 9.22h1.96v-7.4l5 7.4h1.78V6.5h-1.96v7.34L13.86 6.5h-1.82v11z" />
  </svg>
);

export default PfnetIcon;
