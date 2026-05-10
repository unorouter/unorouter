import { atom } from "jotai";

// Active generation id for the unified /generate page. The form sets it on
// submit; the result column reads it. Stays in sync with the URL via the
// page-level effect that seeds it from the route id at mount.
//
// Not persisted: refreshes drop back to the URL-derived id, which is what
// we want for share/refresh/back-button behavior.
export const activeGenerationIdAtom = atom<string | null>(null);
