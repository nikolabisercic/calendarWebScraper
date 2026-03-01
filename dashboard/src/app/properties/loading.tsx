import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <Card>
        <div className="p-4 space-y-3">
          <div className="h-10 animate-pulse rounded bg-muted" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </Card>
    </div>
  );
}
