"use client";

import type {
  IconComponent,
  IconLibraryName,
  IconName,
} from "@/lib/config/icon-map";
import { LUCIDE_STATIC } from "@/lib/config/lucide-static";
import { userThemeAtom } from "@/components/ui/theme/theme-store";
import { debugFlag } from "@/lib/utils/chat-debug-log";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";

// Resolved library icons, keyed by name and library. Nothing here suspends:
// a lazy icon suspended to the nearest boundary, which on the chat page is
// the route, so a non-default icon set flipped the whole page to its loading
// skeleton and back once per icon, about fifty times per open, while fifty
// chunks streamed through the service worker. That paint storm is what froze
// iPhones. The static icon renders at once and swaps when the chunk lands.
const resolved = new Map<string, IconComponent>();
const pending = new Map<string, Promise<void>>();

function load(name: IconName, lib: IconLibraryName): Promise<void> {
  const key = `${name}::${lib}`;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const p = import("@/lib/config/icon-map")
    .then((m) => {
      const loader = m.ICON_MAP[name]?.[lib];
      return loader ? loader() : null;
    })
    .then((mod) => {
      if (mod) resolved.set(key, mod.default);
    })
    .catch(() => {})
    .finally(() => {
      pending.delete(key);
    });
  pending.set(key, p);
  return p;
}

type Props = React.SVGAttributes<SVGSVGElement> & {
  name: IconName;
  size?: number | string;
};

function LibraryIcon(props: Props & { lib: IconLibraryName }) {
  const { name, lib, size, ...rest } = props;
  const key = `${name}::${lib}`;
  const [, bump] = useState(0);
  const Loaded = resolved.get(key);
  useEffect(() => {
    if (resolved.has(key)) return;
    let alive = true;
    void load(name, lib).then(() => {
      if (alive && resolved.has(key)) bump((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [key, name, lib]);
  const sized = { width: size ?? "1em", height: size ?? "1em", ...rest };
  /* eslint-disable react-hooks/static-components -- module-scope maps, referentially stable per (name, lib) pair */
  const Comp = Loaded ?? LUCIDE_STATIC[name];
  return Comp ? <Comp {...sized} /> : null;
  /* eslint-enable react-hooks/static-components */
}

export function Icon(props: Props) {
  const theme = useAtomValue(userThemeAtom);
  // `?dbg=noicons` pins the static set; it is the run that first survived.
  const lib = debugFlag("noicons") ? "lucide" : (theme.iconLibrary ?? "lucide");
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
