"use client";

import type {
  IconComponent,
  IconLibraryName,
  IconName,
} from "@/lib/config/icon-map";
import { LUCIDE_STATIC } from "@/lib/config/lucide-static";
import { userThemeAtom } from "@/lib/theme/theme-store";
import { ICON_LIBRARY_OPTIONS } from "@/lib/theme/tokens";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";

// One chunk per library, loaded on first use: the map used to import one
// module per icon, so a non-default set cost about fifty requests per page.
// Nothing here suspends: a lazy icon suspended to the nearest boundary, which
// on the chat page is the route, so the whole page flipped to its loading
// skeleton and back once per icon. That paint storm is what froze iPhones.
// The static icon renders at once and swaps when the set lands.
type IconSet = Record<string, IconComponent>;
type LibraryName = Exclude<IconLibraryName, "lucide">;
const SETS: Record<LibraryName, () => Promise<{ ICONS: IconSet }>> = {
  tabler: () => import("@/lib/config/icon-sets/tabler"),
  phosphor: () => import("@/lib/config/icon-sets/phosphor"),
  heroicons: () => import("@/lib/config/icon-sets/heroicons"),
  remix: () => import("@/lib/config/icon-sets/remix"),
  iconoir: () => import("@/lib/config/icon-sets/iconoir"),
};
const loaded = new Map<LibraryName, IconSet>();
const pending = new Map<LibraryName, Promise<void>>();

function loadSet(lib: LibraryName): Promise<void> {
  const inFlight = pending.get(lib);
  if (inFlight) return inFlight;
  const p = SETS[lib]()
    .then((m) => {
      loaded.set(lib, m.ICONS);
    })
    .catch(() => {})
    .finally(() => {
      pending.delete(lib);
    });
  pending.set(lib, p);
  return p;
}

type Props = React.SVGAttributes<SVGSVGElement> & {
  name: IconName;
  size?: number | string;
};

function LibraryIcon(props: Props & { lib: LibraryName }) {
  const { name, lib, size, ...rest } = props;
  const [, bump] = useState(0);
  const set = loaded.get(lib);
  useEffect(() => {
    if (loaded.has(lib)) return;
    let alive = true;
    void loadSet(lib).then(() => {
      if (alive && loaded.has(lib)) bump((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [lib]);
  const sized = { width: size ?? "1em", height: size ?? "1em", ...rest };
  /* eslint-disable react-hooks/static-components -- module-scope maps, referentially stable per (name, lib) pair */
  const Comp = set?.[name] ?? LUCIDE_STATIC[name];
  return Comp ? <Comp {...sized} /> : null;
  /* eslint-enable react-hooks/static-components */
}

export function Icon(props: Props) {
  const theme = useAtomValue(userThemeAtom);
  const chosen = theme.global.all?.["icon-library"];
  const lib =
    ICON_LIBRARY_OPTIONS.find((o) => o.value === chosen)?.value ?? "lucide";
  const { name, size, ...rest } = props;

  // SSR and hydration always render the default library (the cookie-backed
  // theme atom resolves post-mount), so lucide must be static: a library
  // icon's chunk only starts loading after scripts execute, and a gap would
  // mismatch the server <svg> (React #418).
  if (lib === "lucide") {
    const sized = { width: size ?? "1em", height: size ?? "1em", ...rest };
    const StaticIcon = LUCIDE_STATIC[name];
    return StaticIcon ? <StaticIcon {...sized} /> : null;
  }
  return <LibraryIcon {...props} lib={lib} />;
}
