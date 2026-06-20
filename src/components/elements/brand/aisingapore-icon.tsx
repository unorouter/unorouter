import type { IconComponent } from "@/lib/config/vendor-icons";

// AI Singapore (SEA-LION). No packaged brand mark; inline "AIS" monogram stand-in.
const AiSingaporeIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>AI Singapore</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm2.9 17.5h1.74l.62-1.84h3.06l.62 1.84h1.78L9.86 6.5H8.2L4.9 17.5zm2.86-3.34 1.05-3.12 1.04 3.12H7.76zm6.34 3.34h1.7V6.5h-1.7v11zm3.96.18c1.94 0 3.18-1 3.18-2.6 0-1.32-.78-2.06-2.5-2.46l-.94-.22c-.86-.2-1.2-.5-1.2-.98 0-.6.54-1 1.36-1 .86 0 1.42.44 1.48 1.18h1.64c-.04-1.5-1.24-2.52-3.08-2.52-1.82 0-3.06.98-3.06 2.46 0 1.28.8 2.06 2.4 2.42l.94.22c.92.22 1.3.52 1.3 1.04 0 .62-.6 1.04-1.5 1.04-.96 0-1.6-.46-1.68-1.22h-1.66c.06 1.56 1.32 2.46 3.32 2.46z" />
  </svg>
);

export default AiSingaporeIcon;
