"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

const chartConfig = {
  occupancy: {
    label: "Occupancy",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type MonthlyOccupancy = {
  month: string;
  occupancy: number;
  booked: number;
  total: number;
};

export function OccupancyChart({ data }: { data: MonthlyOccupancy[] }) {
  const chartData = data.map((d) => ({
    month: d.month,
    occupancy: Math.round(d.occupancy * 100),
  }));

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No data yet
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={chartData}>
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`${value}%`, "Occupancy"]}
            />
          }
        />
        <Bar
          dataKey="occupancy"
          fill="var(--color-occupancy)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
