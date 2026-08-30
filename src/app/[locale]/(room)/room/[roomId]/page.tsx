import { RoomGuestView } from "@/components/pages/room/room-guest-view";
import type { Metadata } from "next";

// A room is a live, private session; indexing a link would be actively wrong.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function RoomPage(props: {
  params: Promise<{ roomId: string }>;
}) {
  const params = await props.params;
  return <RoomGuestView roomId={params.roomId} />;
}
