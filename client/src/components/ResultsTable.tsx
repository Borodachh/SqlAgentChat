import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

interface ResultsTableProps {
  columns: string[];
  rows: Record<string, any>[];
}

export default function ResultsTable({ columns, rows }: ResultsTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted z-10">
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column} 
                  className="font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                  data-testid={`header-${column}`}
                >
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow 
                key={idx} 
                className="hover-elevate"
                data-testid={`row-${idx}`}
              >
                {columns.map((column) => (
                  <TableCell 
                    key={column} 
                    className="text-sm whitespace-nowrap"
                    data-testid={`cell-${idx}-${column}`}
                  >
                    {row[column] !== null && row[column] !== undefined 
                      ? String(row[column]) 
                      : <span className="text-muted-foreground italic">null</span>
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
