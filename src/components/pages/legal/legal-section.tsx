export function LegalSection(props: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-semibold">{props.title}</h2>
      {props.children}
    </section>
  );
}
