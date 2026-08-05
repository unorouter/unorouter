import { Skeleton } from "@/components/ui/skeleton";

// Instant Suspense fallback for the (navbar) content region. The layout's
// static Navbar + Footer prerender into the shell, but the page suspends on its
// "use cache" data awaits (pricing, models); without a fallback the shell paints
// with the footer and an EMPTY content hole until the page RSC lands, which
// reads as "footer first, content pops in". This reserves the content area so
// the shell paints whole. Matches the layout's pt-20 pb-24 content padding.
export function NavbarShellSkeleton() {
  return (
    <div
      aria-busy
      className="mx-auto flex w-full max-w-360 flex-col gap-6 px-4 pt-20 pb-24 sm:px-6"
    >
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-full max-w-2xl" />
      <Skeleton className="h-5 w-5/6 max-w-2xl" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
