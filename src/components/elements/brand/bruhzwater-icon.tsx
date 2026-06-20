import type { IconComponent } from "@/lib/config/vendor-icons";

// BruhzWater. No brand mark in any icon pack, so this is an inline mono "B" monogram stand-in.
const BruhzWaterIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>BruhzWater</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm6.6 17.5h4.06c2.06 0 3.3-.96 3.3-2.56 0-1.16-.74-2-1.9-2.16v-.1c.86-.2 1.46-.96 1.46-1.9 0-1.42-1.1-2.28-2.94-2.28H8.6v9zm1.74-5.32V10.9h1.78c.86 0 1.36.4 1.36 1.06 0 .68-.52 1.08-1.44 1.08h-1.7v-.86zm0 3.96v-2.74h1.84c1 0 1.54.46 1.54 1.36 0 .9-.52 1.38-1.5 1.38h-1.88z" />
  </svg>
);

export default BruhzWaterIcon;
