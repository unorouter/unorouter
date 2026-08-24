import type { IconComponent } from "@/lib/config/vendor-registry";

// GT America Thin T and M outlines kept as geometry: the font file is licensed
// and must not be redistributed.
const ThinkingMachinesIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Thinking Machines</title>
    <path d="M5.90 16.63L6.61 16.63L6.61 7.98L9.71 7.98L9.71 7.37L2.80 7.37L2.80 7.98L5.90 7.98" />
    <path d="M11.78 16.63L12.45 16.63L12.45 8.94C12.45 8.64 12.45 8.37 12.41 8.11L12.44 8.11C12.50 8.36 12.59 8.70 12.70 8.96L15.67 16.63L16.36 16.63L19.34 8.96C19.44 8.70 19.53 8.36 19.60 8.11L19.62 8.11C19.60 8.37 19.58 8.64 19.58 8.94L19.58 16.63L20.26 16.63L20.26 7.37L19.26 7.37L16.24 15.16C16.13 15.47 16.08 15.61 16.04 15.85L16.01 15.85C15.96 15.61 15.91 15.47 15.79 15.16L12.78 7.37L11.78 7.37" />
  </svg>
);

export default ThinkingMachinesIcon;
