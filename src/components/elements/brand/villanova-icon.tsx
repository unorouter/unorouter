import type { IconComponent } from "@/lib/config/vendor-icons";

const VillanovaIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>Villanova</title>
    <path d="M2 4h2.7l4.6 12.6L13.9 4h2.7l-6.2 16H8.2L2 4zm15.3 0H24l-3.3 8 3.3 8h-2.7l-2-5.1-2 5.1H15l3.3-8-3.3-8h2.6l1.4 3.6L17.3 4z" />
  </svg>
);

export default VillanovaIcon;
