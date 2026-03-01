import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { extractPropertyName, type PropertyWithOccupancy } from "@/lib/queries";

export function TopPropertiesTable({
  properties,
}: {
  properties: PropertyWithOccupancy[];
}) {
  if (properties.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No data yet
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>Property</TableHead>
          <TableHead className="text-right">Occupancy</TableHead>
          <TableHead className="text-right">Weekend</TableHead>
          <TableHead className="text-right">Weekday</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {properties.map((p, i) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{i + 1}</TableCell>
            <TableCell>
              <Link
                href={`/properties/${p.id}`}
                className="font-medium hover:underline"
              >
                {extractPropertyName(p.url)}
              </Link>
              {p.lokacija && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {p.lokacija}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right font-mono">
              {(p.occupancy * 100).toFixed(1)}%
            </TableCell>
            <TableCell className="text-right font-mono">
              {(p.weekend_occupancy * 100).toFixed(1)}%
            </TableCell>
            <TableCell className="text-right font-mono">
              {(p.weekday_occupancy * 100).toFixed(1)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
