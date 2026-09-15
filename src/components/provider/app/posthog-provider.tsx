"use client";

// Used to identify every logged-in user to PostHog with display_name, username
// and email. Nothing does that now: posthog-lazy runs with
// person_profiles: "never", so events say which feature was used and never by
// whom, and an identify call would have no profile to attach to anyway.
// Kept as a pass-through rather than removed so the layout does not change and
// the reason stays next to the thing it explains.
export function PostHogProvider(props: { children: React.ReactNode }) {
  return <>{props.children}</>;
}
