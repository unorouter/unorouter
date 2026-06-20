import type { IconComponent } from "@/lib/config/vendor-icons";

// Anthracite (Magnum RP finetunes). No packaged brand mark; inline "A" monogram stand-in.
const AnthraciteIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Anthracite</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm2.9 17.5h1.74l.62-1.84h3.06l.62 1.84h1.78L9.86 6.5H8.2L4.9 17.5zm2.86-3.34 1.05-3.12 1.04 3.12H7.76z" />
  </svg>
);

export default AnthraciteIcon;
