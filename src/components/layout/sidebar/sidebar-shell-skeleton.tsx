import { Skeleton } from "@/components/ui/skeleton";

// Instant Suspense fallback for the sidebar-shell route groups ((docs),
// (sidebar)). Their layouts stream per request behind auth awaits; without a
// fallback a soft nav freezes the previous page until the stream lands and
// then swaps the whole viewport, which reads as a full reload.
export function SidebarShellSkeleton() {
  return (
    <div aria-busy className="flex h-svh w-full overflow-hidden">
      <div className="border-border/50 hidden w-64 shrink-0 flex-col gap-3 border-r p-3 md:flex">
        <Skeleton className="h-9 w-full" />
        <div className="mt-2 flex flex-col gap-2">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-5/6" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-7 w-5/6" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-5/6 max-w-2xl" />
        <div className="mt-4 grid max-w-4xl gap-4 md:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
