import type { IconComponent } from "@/lib/config/vendor-icons";

const DictaIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Dicta</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm6 6v12h4.3c3.7 0 6.2-2.4 6.2-6s-2.5-6-6.2-6H8zm2.7 2.4h1.4c2.2 0 3.6 1.4 3.6 3.6s-1.4 3.6-3.6 3.6h-1.4V8.4z" />
  </svg>
);

export default DictaIcon;
