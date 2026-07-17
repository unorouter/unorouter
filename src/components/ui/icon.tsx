"use client";

import type {
  IconComponent,
  IconLibraryName,
  IconName,
} from "@/lib/config/icon-map";
import { LUCIDE_STATIC } from "@/lib/config/lucide-static";
import { userThemeAtom } from "@/components/ui/theme/theme-store";
import { cn } from "@/lib/utils";
import { useAtomValue } from "jotai";
import { lazy, Suspense } from "react";

const cache = new Map<string, IconComponent>();

function getIcon(name: IconName, lib: IconLibraryName): IconComponent {
  const key = `${name}::${lib}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const fallback = LUCIDE_STATIC[name] ?? (() => null);
  const Lazy = lazy(() =>
    import("@/lib/config/icon-map")
      .then((m) => {
        const loader = m.ICON_MAP[name]?.[lib];
        if (!loader) return { default: fallback };
        return loader();
      })
      .catch(() => {
        cache.delete(key);
        return { default: fallback };
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
  const sized = { width: size ?? "1em", height: size ?? "1em", ...rest };

  // SSR and hydration always render the default library (the cookie-backed
  // theme atom resolves post-mount), so lucide must be static: a lazy icon's
  // chunk only starts loading after scripts execute, the component suspends
  // mid-hydration, and the Suspense fallback mismatches the server <svg>
  // (React #418). Alternate libraries only ever render post-mount, where
  // lazy loading is safe.
  if (lib === "lucide") {
    const StaticIcon = LUCIDE_STATIC[name];
    return StaticIcon ? <StaticIcon {...sized} /> : null;
  }

  const IconComp = getIcon(name, lib);
  return (
    <Suspense
      // The fallback must occupy the exact box of the icon it replaces: a
      // bare in-flow span under an absolutely-positioned icon adds a line
      // box and shifts everything below (models page CLS 0.2 on mobile).
      fallback={
        <span
          className={cn("inline-block size-[1em]", props.className)}
          style={size ? { width: size, height: size } : undefined}
          aria-hidden
        />
      }
    >
      {/* eslint-disable-next-line react-hooks/static-components -- cached in module-scope map, referentially stable per (name, lib) pair */}
      <IconComp {...sized} />
    </Suspense>
  );
}
