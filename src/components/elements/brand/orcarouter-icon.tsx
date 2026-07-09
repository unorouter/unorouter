import type { IconComponent } from "@/lib/config/vendor-icons";

const OrcaRouterIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>OrcaRouter</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm3.6 17.5h1.9v-4.2l3.2 4.2h2.3l-3.4-4.4c1.4-.3 2.3-1.4 2.3-3 0-2-1.4-3.1-3.7-3.1H5.6v10.5zm1.9-8.9h1.5c1.2 0 1.9.6 1.9 1.7s-.7 1.7-1.9 1.7H7.5V8.6zm7.9 8.9h5.1v-1.5h-3.2V6.9h-1.9v10.6z" />
  </svg>
);

export default OrcaRouterIcon;
