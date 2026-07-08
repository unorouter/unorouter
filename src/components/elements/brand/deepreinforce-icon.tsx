import type { IconComponent } from "@/lib/config/vendor-icons";

const DeepReinforceIcon: IconComponent = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
  >
    <title>DeepReinforce</title>
    <path d="M3 3h6c3.6 0 6 2.4 6 6s-2.4 6-6 6H5.4v6H3V3zm2.4 2.2v7.6H9c2.2 0 3.6-1.5 3.6-3.8S11.2 5.2 9 5.2H5.4zM17 9h2.3v3.6H24v2.1h-4.7V21H17V9z" />
  </svg>
);

export default DeepReinforceIcon;
