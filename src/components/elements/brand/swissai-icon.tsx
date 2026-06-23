import type { IconComponent } from "@/lib/config/vendor-icons";

// Swiss AI (Apertus, ETH Zurich + EPFL + CSCS). No public brand-kit SVG (logo is
// proprietary Molinari Design), so a Swiss-cross monogram stand-in.
const SwissAiIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Swiss AI</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm8.5 6v3.5H7v3h3.5V16h3v-3.5H17v-3h-3.5V6h-3z" />
  </svg>
);

export default SwissAiIcon;
