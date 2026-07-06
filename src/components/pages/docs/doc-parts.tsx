import { CodeBlock } from "@/components/elements/code/code-block";

export function DocSection(props: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-2xl font-semibold" id={props.id}>
        {props.title}
      </h2>
      <div className="text-muted-foreground space-y-4 text-sm">
        {props.children}
      </div>
    </section>
  );
}

export function DocTable(props: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50">
          <tr>
            {props.headers.map((header) => (
              <th
                key={header}
                className="text-foreground px-4 py-2 font-medium"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, idx) => (
            <tr key={idx} className="border-border border-t">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocCode(props: { code: string; lang?: string }) {
  return <CodeBlock code={props.code} language={props.lang ?? "text"} />;
}

export function DocKbd(props: { children: React.ReactNode }) {
  return (
    <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
      {props.children}
    </code>
  );
}
