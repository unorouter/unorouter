"use client";

import { useMediaSrc } from "@/hooks/ai/use-media-src";

type Props = {
  mediaId: string | null;
  name: string;
};

export function CharacterAvatar(props: Props) {
  const src = useMediaSrc(props.mediaId);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={props.name}
        width={40}
        height={40}
        className="size-10 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="bg-muted flex size-10 items-center justify-center rounded-full text-sm">
      {props.name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
