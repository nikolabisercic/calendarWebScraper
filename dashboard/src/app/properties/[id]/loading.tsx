import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-2 flex gap-2">
          <div className="h-6 w-20 animate-pulse rounded bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-9 w-20 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}
