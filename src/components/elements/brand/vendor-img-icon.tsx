import type { IconComponent } from "@/lib/config/vendor-icons";

export function makeImgIcon(src: string, alt: string): IconComponent {
  const Icon: IconComponent = (props) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={props.size ?? 24}
      height={props.size ?? 24}
      className={`object-contain ${props.className ?? ""}`}
    />
  );
  return Icon;
}
