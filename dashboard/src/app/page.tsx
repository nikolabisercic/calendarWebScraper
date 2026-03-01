import {
  getProperties,
  getAvailability,
  computePropertiesWithOccupancy,
  computeMonthlyOccupancy,
  isWeekend,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OccupancyChart } from "@/components/occupancy-chart";
import { TopPropertiesTable } from "@/components/top-properties-table";

export const revalidate = 3600;

export default async function OverviewPage() {
  const [properties, availability] = await Promise.all([
    getProperties(),
    getAvailability(),
  ]);

  const propertiesWithOcc = computePropertiesWithOccupancy(
    properties,
    availability
  );
  const monthlyOcc = computeMonthlyOccupancy(availability);

  const totalProperties = properties.length;
  const totalDays = availability.length;
  const totalBooked = availability.filter((r) => r.booked).length;
  const overallOccupancy = totalDays > 0 ? totalBooked / totalDays : 0;

  const weekendRows = availability.filter((r) => isWeekend(r.date));
  const weekendOcc =
    weekendRows.length > 0
      ? weekendRows.filter((r) => r.booked).length / weekendRows.length
      : 0;

  const weekdayRows = availability.filter((r) => !isWeekend(r.date));
  const weekdayOcc =
    weekdayRows.length > 0
      ? weekdayRows.filter((r) => r.booked).length / weekdayRows.length
      : 0;

  const lastChecked =
    availability.length > 0
      ? availability.reduce((latest, r) =>
          r.checked_at > latest.checked_at ? r : latest
        ).checked_at
      : null;

  const topProperties = [...propertiesWithOcc]
    .sort((a, b) => b.occupancy - a.occupancy)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Occupancy analytics across {totalProperties} tracked properties
          {lastChecked && (
            <>
              {" "}
              &middot; Last updated{" "}
              {new Date(lastChecked + "Z").toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Belgrade",
              })}
            </>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Properties Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalProperties}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(overallOccupancy * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weekend Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(weekendOcc * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weekday Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(weekdayOcc * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Occupancy Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <OccupancyChart data={monthlyOcc} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Properties by Occupancy</CardTitle>
        </CardHeader>
        <CardContent>
          <TopPropertiesTable properties={topProperties} />
        </CardContent>
      </Card>
    </div>
  );
}
