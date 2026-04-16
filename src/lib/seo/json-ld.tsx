import type { Thing, WithContext } from "schema-dts";

interface JsonLdProps {
  data: WithContext<Thing> | WithContext<Thing>[];
  id?: string;
}

export function JsonLd(props: JsonLdProps) {
  return (
    <script
      key={props.id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(props.data) }}
      suppressHydrationWarning
    />
  );
}
