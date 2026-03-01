import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getProperties,
  getPropertyAvailability,
  computePropertyMonthlyOccupancy,
  extractPropertyName,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OccupancyChart } from "@/components/occupancy-chart";
import { CalendarHeatmap } from "@/components/calendar-heatmap";

export const revalidate = 3600;

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const propertyId = parseInt(id, 10);
  if (isNaN(propertyId)) notFound();

  const [properties, availability] = await Promise.all([
    getProperties(),
    getPropertyAvailability(propertyId),
  ]);

  const property = properties.find((p) => p.id === propertyId);
  if (!property) notFound();

  const monthlyOcc = computePropertyMonthlyOccupancy(availability);
  const totalDays = availability.length;
  const bookedDays = availability.filter((r) => r.booked).length;
  const occupancy = totalDays > 0 ? bookedDays / totalDays : 0;

  const weekendRows = availability.filter((r) => {
    const d = new Date(r.date + "T00:00:00");
    const day = d.getDay();
    return day === 0 || day === 5 || day === 6;
  });
  const weekendOcc =
    weekendRows.length > 0
      ? weekendRows.filter((r) => r.booked).length / weekendRows.length
      : 0;

  const name = extractPropertyName(property.url);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/properties"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Properties
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{name}</h1>
        <div className="mt-1 flex items-center gap-2">
          {property.lokacija && (
            <Badge variant="secondary">{property.lokacija}</Badge>
          )}
          {property.kapacitet_kuce && (
            <Badge variant="outline">{property.kapacitet_kuce}</Badge>
          )}
          <a
            href={property.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View on Weekendica
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(occupancy * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {bookedDays} of {totalDays} days booked
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
            <p className="text-xs text-muted-foreground">
              Fri / Sat / Sun
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Days Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalDays}</p>
            <p className="text-xs text-muted-foreground">
              {availability.length > 0 &&
                `${availability[0].date} to ${availability[availability.length - 1].date}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Occupancy</CardTitle>
        </CardHeader>
        <CardContent>
          <OccupancyChart data={monthlyOcc} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarHeatmap data={availability} />
        </CardContent>
      </Card>
    </div>
  );
}
