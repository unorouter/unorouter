"use client";

import type {
  IconComponent,
  IconLibraryName,
  IconName,
} from "@/lib/config/icon-map";
import { LoaderIcon } from "@/components/ui/local-icons";
import { userThemeAtom } from "@/components/ui/theme/theme-store";
import { useAtomValue } from "jotai";
import { Suspense, lazy } from "react";

const cache = new Map<string, IconComponent>();

// ICON_MAP is a 2k-line module (850 loader closures); importing it statically
// put it in the shared chunk every page parses. Load it with the first icon
// render instead; resolution happens inside the lazy thunk.
function getIcon(name: IconName, lib: IconLibraryName): IconComponent {
  const key = `${name}::${lib}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const Lazy = lazy(() =>
    import("@/lib/config/icon-map")
      .then((m) => {
        const entry = m.ICON_MAP[name];
        const loader = entry?.[lib] ?? entry?.lucide;
        if (!loader) return { default: (() => null) as IconComponent };
        return loader();
      })
      // Chunk timeout degrades to the spinner glyph instead of throwing out of
      // lazy() into the global error boundary; evict so the next render retries.
      .catch(() => {
        cache.delete(key);
        return { default: LoaderIcon as IconComponent };
      }),
  ) as IconComponent;
  cache.set(key, Lazy);
  return Lazy;
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
  // Spinner inherits consumer className/size so layout stays put during
  // chunk load. animate-spin appended.
  const spinnerProps = {
    ...sized,
    className: rest.className
      ? `${rest.className} animate-spin`
      : "animate-spin",
  };
  return (
    <Suspense fallback={<LoaderIcon {...spinnerProps} />}>
      {/* eslint-disable-next-line react-hooks/static-components -- cached in module-scope map, referentially stable per (name, lib) pair */}
      <IconComp {...sized} />
    </Suspense>
  );
}
