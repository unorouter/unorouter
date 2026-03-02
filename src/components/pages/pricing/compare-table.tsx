import { LuCheck, LuX } from "react-icons/lu";

type CompareRowData = {
  feature: string;
  basic: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
};

type Props = {
  title: string;
  featureLabel: string;
  basicName: string;
  proName: string;
  enterpriseName: string;
  rows: CompareRowData[];
};

export function CompareTable(props: Props) {
  return (
    <div className="mt-20">
      <h2 className="mb-8 text-center text-2xl font-bold">{props.title}</h2>
      <div className="border-border overflow-x-auto border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="text-muted-foreground px-6 py-4 text-left font-medium">
                {props.featureLabel}
              </th>
              <th className="px-6 py-4 text-center font-medium">
                {props.basicName}
              </th>
              <th className="bg-primary/5 px-6 py-4 text-center font-medium">
                {props.proName}
              </th>
              <th className="px-6 py-4 text-center font-medium">
                {props.enterpriseName}
              </th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => (
              <CompareRow
                key={row.feature}
                feature={row.feature}
                basic={row.basic}
                pro={row.pro}
                enterprise={row.enterprise}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompareRow(props: {
  feature: string;
  basic: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
}) {
  return (
    <tr className="border-border border-b last:border-b-0">
      <td className="text-muted-foreground px-6 py-3">{props.feature}</td>
      <CompareCell value={props.basic} />
      <CompareCell value={props.pro} highlighted />
      <CompareCell value={props.enterprise} />
    </tr>
  );
}

function CompareCell(props: {
  value: string | boolean;
  highlighted?: boolean;
}) {
  return (
    <td
      className={`px-6 py-3 text-center ${props.highlighted ? "bg-primary/5" : ""}`}
    >
      {typeof props.value === "boolean" ? (
        props.value ? (
          <LuCheck className="text-primary mx-auto h-4 w-4" />
        ) : (
          <LuX className="text-muted-foreground mx-auto h-4 w-4" />
        )
      ) : (
        <span className="font-mono text-sm">{props.value}</span>
      )}
    </td>
  );
}
