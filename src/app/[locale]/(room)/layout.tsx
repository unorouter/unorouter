// Deliberately minimal: no store, no runtime, no sidebar. A guest opens no
// database, so none of the chat shell's providers belong here. It exists only
// to paint the app background, which the muted message bubbles need under them
// to read as bubbles at all.
export default function RoomLayout(props: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground min-h-svh">
      {props.children}
    </div>
  );
}
