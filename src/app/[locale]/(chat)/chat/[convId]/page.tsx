import { Chat } from "@/components/pages/chat/chat";

type Props = {
  params: Promise<{ convId: string }>;
};

export default async function ChatConvPage(props: Props) {
  const { convId } = await props.params;
  return <Chat initialConvId={convId} />;
}
