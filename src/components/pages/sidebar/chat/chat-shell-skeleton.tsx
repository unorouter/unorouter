import { Skeleton } from "@/components/ui/skeleton";

// Instant fallback for the chat layout's streamed Suspense hole. The chat
// shell is fully dynamic (auth/best-key awaits stream per request), so without
// a fallback a soft nav into /chat shows the FROZEN previous page until the
// stream lands and then swaps the whole viewport - visually identical to a
// full reload. This static skeleton renders immediately from the prerendered
// shell so the transition reads as an in-app navigation.
export function ChatShellSkeleton() {
  return (
    <div aria-busy className="flex h-dvh w-full overflow-hidden">
      <div className="border-border/50 hidden w-64 shrink-0 flex-col gap-3 border-r p-3 md:flex">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <div className="mt-2 flex flex-col gap-2">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-5/6" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-2/3" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-border/50 flex h-12 items-center gap-2 border-b px-4">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4">
          <Skeleton className="h-6 w-48 self-center" />
          <Skeleton className="h-4 w-72 max-w-full self-center" />
        </div>
        <div className="mx-auto w-full max-w-2xl px-4 pb-6">
          <Skeleton className="h-24 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
