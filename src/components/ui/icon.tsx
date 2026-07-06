"use client";

import type {
  IconComponent,
  IconLibraryName,
  IconName,
} from "@/lib/config/icon-map";
import { userThemeAtom } from "@/components/ui/theme/theme-store";
import { useAtomValue } from "jotai";
import { lazy, Suspense } from "react";

const cache = new Map<string, IconComponent>();

if (typeof window !== "undefined") {
  const warm = () => void import("@/lib/config/icon-map");
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warm, { timeout: 2000 });
  } else {
    setTimeout(warm, 300);
  }
}

function getIcon(name: IconName, lib: IconLibraryName): IconComponent {
  const key = `${name}::${lib}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const Lazy = lazy(() =>
    import("@/lib/config/icon-map")
      .then((m) => {
        const entry = m.ICON_MAP[name];
        const loader = entry?.[lib] ?? entry?.lucide;
        if (!loader) return { default: () => null };
        return loader();
      })
      .catch(() => {
        cache.delete(key);
        return { default: () => null };
      }),
  );
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
  const sized = { width: size ?? "1em", height: size ?? "1em", ...rest };
  return (
    <Suspense
      fallback={<span className="inline-block size-[1em]" aria-hidden />}
    >
      {/* eslint-disable-next-line react-hooks/static-components -- cached in module-scope map, referentially stable per (name, lib) pair */}
      <IconComp {...sized} />
    </Suspense>
  );
}
