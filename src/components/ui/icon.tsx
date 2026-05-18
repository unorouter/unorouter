"use client";

import {
  ICON_MAP,
  type IconLibraryName,
  type IconName,
} from "@/lib/config/icon-map";
import { userThemeAtom } from "@/components/ui/theme/theme-store";
import { useAtomValue } from "jotai";
import { Suspense, lazy, type ComponentType } from "react";
import { LuLoader } from "react-icons/lu";

type Cmp = ComponentType<
  React.SVGAttributes<SVGSVGElement> & { size?: number | string }
>;

const cache = new Map<string, Cmp>();

function getIcon(name: IconName, lib: IconLibraryName): Cmp | null {
  const key = `${name}::${lib}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const entry = ICON_MAP[name];
  if (!entry) return null;
  const loader = entry[lib] ?? entry.lucide;
  if (!loader) return null;

  const Lazy = lazy(loader) as Cmp;
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
  const { name, ...rest } = props;
  const IconComp = getIcon(name, lib);
  if (!IconComp) return null;
  // Spinner inherits consumer className/size so layout stays put during
  // chunk load. animate-spin appended.
  const spinnerProps = {
    ...rest,
    className: rest.className
      ? `${rest.className} animate-spin`
      : "animate-spin",
  };
  return (
    <Suspense fallback={<LuLoader {...spinnerProps} />}>
      {/* eslint-disable-next-line react-hooks/static-components -- cached in module-scope map, referentially stable per (name, lib) pair */}
      <IconComp {...rest} />
    </Suspense>
  );
}
