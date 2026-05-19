import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GridPricingRow } from "@/lib/api/pricing";
import { formatPrice } from "@/lib/utils/format/number";

type GridPricingTableProps = {
  rows: GridPricingRow[];
  priceLabel: string;
};

export function GridPricingTable(props: GridPricingTableProps) {
  const first = props.rows[0];
  if (!first) return null;
  const columns = Object.keys(first).filter(
    (k) => k !== "Pricing" && k !== "PricingSuffix",
  );

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columns.map((col) => (
              <TableHead
                key={col}
                className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
              >
                {col}
              </TableHead>
            ))}
            <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
              {props.priceLabel}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rows.map((row, i) => {
            const price = typeof row.Pricing === "number" ? row.Pricing : 0;
            const suffix =
              typeof row.PricingSuffix === "string" ? row.PricingSuffix : "";
            return (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell
                    key={col}
                    className="text-muted-foreground font-mono text-xs"
                  >
                    {String(row[col] ?? "")}
                  </TableCell>
                ))}
                <TableCell className="text-right font-mono text-xs">
                  {formatPrice(price)}
                  {suffix && (
                    <span className="text-muted-foreground ml-1">{suffix}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
