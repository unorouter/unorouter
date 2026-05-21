"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMediaSrc } from "@/hooks/ai/use-media-src";

type Props = {
  mediaId: string | null;
  name: string;
};

export function CharacterAvatar(props: Props) {
  const src = useMediaSrc(props.mediaId);
  return (
    <Avatar className="size-10">
      {src && <AvatarImage src={src} alt={props.name} />}
      <AvatarFallback>{props.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
    </Avatar>
  );
}
