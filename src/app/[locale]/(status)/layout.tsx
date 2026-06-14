import { ContentBoundary } from "@/components/elements/feedback/content-boundary";

type Props = {
  children: React.ReactNode;
};

export default function StatusLayout(props: Props) {
  return (
    <main className="flex-1">
      <ContentBoundary>{props.children}</ContentBoundary>
    </main>
  );
}
