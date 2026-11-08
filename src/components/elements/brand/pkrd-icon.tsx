import type { IconComponent } from "@/lib/config/vendor-registry";

const PkrdIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 256 256"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>PKRD</title>
    <path
      transform="translate(0,256) scale(0.1,-0.1)"
      d="M1560 2221 l0 -291 283 -200 c155 -111 283 -204 284 -208 2 -4 -126 "
    />
  </svg>
);

export default PkrdIcon;
