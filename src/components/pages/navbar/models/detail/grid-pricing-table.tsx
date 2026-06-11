import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  gridPriceParts,
  gridPricingColumns,
  type GridPricingRow,
} from "@/lib/api/pricing";
import { formatPrice } from "@/lib/utils/format/number";

type GridPricingTableProps = {
  rows: GridPricingRow[];
  priceLabel: string;
};

export function GridPricingTable(props: GridPricingTableProps) {
  const columns = gridPricingColumns(props.rows);
  if (columns.length === 0) return null;

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
            const { price, suffix } = gridPriceParts(row);
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
