import { supabase } from "./supabase";

export type Property = {
  id: number;
  url: string;
  lokacija: string | null;
  kapacitet_kuce: string | null;
};

export type AvailabilityRow = {
  property_id: number;
  date: string;
  booked: boolean;
  checked_at: string;
};

export type PropertyWithOccupancy = Property & {
  total_days: number;
  booked_days: number;
  occupancy: number;
  weekend_occupancy: number;
  weekday_occupancy: number;
};

export type MonthlyOccupancy = {
  month: string; // "2026-01"
  occupancy: number;
  booked: number;
  total: number;
};

export async function getProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, url, lokacija, kapacitet_kuce")
    .order("id");
  if (error) throw error;
  return data;
}

export async function getAvailability(): Promise<AvailabilityRow[]> {
  const PAGE_SIZE = 1000;
  // Limit to last 12 months to bound query growth
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  let allData: AvailabilityRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("availability")
      .select("property_id, date, booked, checked_at")
      .gte("date", cutoffStr)
      .order("date")
      .order("property_id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allData;
}

export async function getPropertyById(
  propertyId: number
): Promise<Property | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, url, lokacija, kapacitet_kuce")
    .eq("id", propertyId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }
  return data;
}

export async function getPropertyAvailability(
  propertyId: number
): Promise<AvailabilityRow[]> {
  const PAGE_SIZE = 1000;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  let allData: AvailabilityRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("availability")
      .select("property_id, date, booked, checked_at")
      .eq("property_id", propertyId)
      .gte("date", cutoffStr)
      .order("date")
      .order("property_id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allData;
}

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 5 || day === 6; // Fri, Sat, Sun
}

export function computePropertiesWithOccupancy(
  properties: Property[],
  availability: AvailabilityRow[]
): PropertyWithOccupancy[] {
  // Group availability by property_id
  const byProperty = new Map<number, AvailabilityRow[]>();
  for (const row of availability) {
    const list = byProperty.get(row.property_id) || [];
    list.push(row);
    byProperty.set(row.property_id, list);
  }

  return properties.map((p) => {
    const rows = byProperty.get(p.id) || [];
    const total_days = rows.length;
    const booked_days = rows.filter((r) => r.booked).length;
    const occupancy = total_days > 0 ? booked_days / total_days : 0;

    const weekendRows = rows.filter((r) => isWeekend(r.date));
    const weekdayRows = rows.filter((r) => !isWeekend(r.date));
    const weekend_occupancy =
      weekendRows.length > 0
        ? weekendRows.filter((r) => r.booked).length / weekendRows.length
        : 0;
    const weekday_occupancy =
      weekdayRows.length > 0
        ? weekdayRows.filter((r) => r.booked).length / weekdayRows.length
        : 0;

    return {
      ...p,
      total_days,
      booked_days,
      occupancy,
      weekend_occupancy,
      weekday_occupancy,
    };
  });
}

export function computeMonthlyOccupancy(
  availability: AvailabilityRow[]
): MonthlyOccupancy[] {
  const byMonth = new Map<string, { booked: number; total: number }>();

  for (const row of availability) {
    const month = row.date.slice(0, 7); // "2026-01"
    const entry = byMonth.get(month) || { booked: 0, total: 0 };
    entry.total++;
    if (row.booked) entry.booked++;
    byMonth.set(month, entry);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { booked, total }]) => ({
      month,
      occupancy: total > 0 ? booked / total : 0,
      booked,
      total,
    }));
}

export function computePropertyMonthlyOccupancy(
  availability: AvailabilityRow[]
): MonthlyOccupancy[] {
  return computeMonthlyOccupancy(availability);
}

export function extractPropertyName(url: string): string {
  // https://www.weekendica.com/vikendica/vila-piano/ -> "Vila Piano"
  const match = url.match(/\/vikendica\/([^/]+)/);
  if (!match) return url;
  return match[1]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
