"use client";

import type {
  IconComponent,
  IconLibraryName,
  IconName,
} from "@/lib/config/icon-map";
import { userThemeAtom } from "@/components/ui/theme/theme-store";
import { useAtomValue } from "jotai";
import dynamic from "next/dynamic";

const cache = new Map<string, IconComponent>();

// Warm the deferred icon-map module after first paint: it stays out of the
// first-paint chunks, but loading it on idle means client-mounted icons only
// await their tiny per-icon chunk instead of map + chunk.
if (typeof window !== "undefined") {
  const warm = () => void import("@/lib/config/icon-map");
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warm, { timeout: 2000 });
  } else {
    setTimeout(warm, 300);
  }
}

// ICON_MAP is a 2k-line module (850 loader closures); importing it statically
// put it in the shared chunk every page parses. next/dynamic keeps it out of
// the client bundle but SSRs the real icon (React.lazy put a spinner into the
// server HTML for every icon on the page); the loading fallback only shows for
// client-only mounts (menus, dialogs).
function getIcon(name: IconName, lib: IconLibraryName): IconComponent {
  const key = `${name}::${lib}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const Dyn = dynamic(
    () =>
      import("@/lib/config/icon-map")
        .then((m) => {
          const entry = m.ICON_MAP[name];
          const loader = entry?.[lib] ?? entry?.lucide;
          if (!loader) return { default: (() => null) as IconComponent };
          return loader();
        })
        // Chunk timeout degrades to an empty slot instead of throwing into the
        // global error boundary; evict so the next render retries.
        .catch(() => {
          cache.delete(key);
          return { default: (() => null) as IconComponent };
        }),
    {
      loading: () => <span className="inline-block size-[1em]" aria-hidden />,
    },
  ) as IconComponent;
  cache.set(key, Dyn);
  return Dyn;
}

type Props = React.SVGAttributes<SVGSVGElement> & {
  name: IconName;
  size?: number | string;
};

export function Icon(props: Props) {
  const theme = useAtomValue(userThemeAtom);
  const lib = (theme.iconLibrary ?? "lucide") as IconLibraryName;
  const { name, size, ...rest } = props;
  const IconComp = getIcon(name, lib);
  if (!IconComp) return null;
  // Not every lib supports a `size` prop (heroicons/iconoir don't); width and
  // height are universal SVG attributes and CSS classes still win over them.
  const sized = { width: size ?? "1em", height: size ?? "1em", ...rest };
  // eslint-disable-next-line react-hooks/static-components -- cached in module-scope map, referentially stable per (name, lib) pair
  return <IconComp {...sized} />;
}
