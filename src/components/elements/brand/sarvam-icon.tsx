import type { IconComponent } from "@/lib/config/vendor-registry";

const SarvamIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Sarvam</title>
    <path d="M2 0h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm10 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zm0 2.1a5.4 5.4 0 1 1 0 10.8 5.4 5.4 0 0 1 0-10.8zm0 2.2a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z" />
  </svg>
);

export default SarvamIcon;
