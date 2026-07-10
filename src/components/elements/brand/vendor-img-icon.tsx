import type { IconComponent } from "@/lib/config/vendor-registry";

const MODE_CLASS = {
  plain: "grayscale",
  invertDark: "grayscale dark:invert",
} as const;

export type ImgIconMode = keyof typeof MODE_CLASS;

export function makeImgIcon(
  src: string,
  alt: string,
  mode: ImgIconMode = "plain",
): IconComponent {
  const Icon: IconComponent = (props) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={props.size ?? 24}
      height={props.size ?? 24}
      loading="lazy"
      decoding="async"
      className={`object-contain ${MODE_CLASS[mode]} ${props.className ?? ""}`}
    />
  );
  return Icon;
}
