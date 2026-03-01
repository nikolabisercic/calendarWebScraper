import Link from "next/link";
import {
  getProperties,
  getAvailability,
  computePropertiesWithOccupancy,
  extractPropertyName,
} from "@/lib/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600;

export default async function PropertiesPage() {
  const [properties, availability] = await Promise.all([
    getProperties(),
    getAvailability(),
  ]);

  const propertiesWithOcc = computePropertiesWithOccupancy(
    properties,
    availability
  );

  // Sort by occupancy descending
  const sorted = [...propertiesWithOcc].sort(
    (a, b) => b.occupancy - a.occupancy
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Properties</h1>
        <p className="text-sm text-muted-foreground">
          All {properties.length} tracked rental properties, ranked by occupancy
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead className="text-right">Total Occ.</TableHead>
              <TableHead className="text-right">Weekend</TableHead>
              <TableHead className="text-right">Weekday</TableHead>
              <TableHead className="text-right">Days Tracked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p, i) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-muted-foreground">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/properties/${p.id}`}
                    className="font-medium hover:underline"
                  >
                    {extractPropertyName(p.url)}
                  </Link>
                </TableCell>
                <TableCell>
                  {p.lokacija ? (
                    <Badge variant="secondary">{p.lokacija}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {p.kapacitet_kuce || (
                    <span className="text-muted-foreground">-</span>
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
                <TableCell className="text-right text-muted-foreground">
                  {p.total_days}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
