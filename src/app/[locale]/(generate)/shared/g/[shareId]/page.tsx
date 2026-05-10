import { SharedGenerationView } from "@/components/pages/sidebar/generate/shared-generation-view";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; shareId: string }>;
};

// Public view of a shared generation. No auth required to view. The
// "Save to my account" button on the page calls the fork mutation
// (logged-in users only — the route will 401 otherwise and we redirect
// to /login).
export default async function SharedGenerationPage(props: Props) {
  const { shareId } = await props.params;
  const queryClient = getQueryClient();

  // Prefetch so the client component renders the data on first paint
  // without a flash of skeleton. notFound() if the share token doesn't
  // resolve.
  try {
    await queryClient.fetchQuery({
      queryKey: queryKeys.sharedGenerationSession(shareId),
      queryFn: async () =>
        handleElysia(
          await rpc.api.generation.shared({ shareId }).get(),
        ),
    });
  } catch {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SharedGenerationView shareId={shareId} />
    </HydrationBoundary>
  );
}
