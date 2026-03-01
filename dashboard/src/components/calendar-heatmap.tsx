"use client";

import { type AvailabilityRow } from "@/lib/queries";

export function CalendarHeatmap({ data }: { data: AvailabilityRow[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No data yet
      </p>
    );
  }

  // Group by month
  const byMonth = new Map<string, AvailabilityRow[]>();
  for (const row of data) {
    const month = row.date.slice(0, 7);
    const list = byMonth.get(month) || [];
    list.push(row);
    byMonth.set(month, list);
  }

  const months = Array.from(byMonth.keys()).sort();

  return (
    <div className="space-y-4">
      {months.map((month) => {
        const rows = byMonth.get(month)!;
        const [year, m] = month.split("-");
        const monthName = new Date(
          parseInt(year),
          parseInt(m) - 1,
          1
        ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

        const bookedCount = rows.filter((r) => r.booked).length;

        return (
          <div key={month}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-medium">{monthName}</h3>
              <span className="text-xs text-muted-foreground">
                {bookedCount}/{rows.length} booked
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {rows
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((row) => {
                  const dayNum = parseInt(row.date.slice(8, 10));
                  const d = new Date(row.date + "T00:00:00");
                  const dayName = d.toLocaleDateString("en-US", {
                    weekday: "short",
                  });

                  return (
                    <div
                      key={row.date}
                      className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium ${
                        row.booked
                          ? "bg-chart-1 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                      aria-label={`${row.date} (${dayName}) - ${row.booked ? "Booked" : "Available"}`}
                      title={`${row.date} (${dayName}) - ${row.booked ? "Booked" : "Available"}`}
                    >
                      {dayNum}
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-chart-1" />
          Booked
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-muted" />
          Available
        </div>
      </div>
    </div>
  );
}
