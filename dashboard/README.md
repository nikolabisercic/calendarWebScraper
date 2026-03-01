# Rental Tracker Dashboard

Next.js analytics dashboard for the rental property occupancy tracker. Reads data from Supabase and displays occupancy metrics, trends, and per-property details.

## Tech Stack

- **Next.js 16** (App Router, Server Components)
- **shadcn/ui** — Cards, tables, badges, tabs
- **shadcn/charts** (Recharts) — Bar charts for occupancy trends
- **next-themes** — Light/dark theme with system detection
- **Tailwind CSS v4**
- **Supabase JS** — Server-side data fetching from PostgreSQL

## Pages

| Route              | Description                                         |
| ------------------ | --------------------------------------------------- |
| `/`                | Overview — KPI cards, monthly trend chart, top 5    |
| `/properties`      | All 23 properties ranked by occupancy               |
| `/properties/[id]` | Property detail — monthly chart + calendar heatmap  |

## Development

### Prerequisites

- Node.js 18+
- Supabase project with `properties` and `availability` tables

### Setup

```bash
cd dashboard
npm install
```

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

### Run

```bash
npm run dev
```

Open http://localhost:3000.

### Build

```bash
npm run build
npm run start
```

## Deployment

Deployed on Vercel with auto-deploy on push to `master`. The Vercel project root directory is set to `dashboard/`.

Environment variables on Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key — read-only access)

## Data Flow

Server components fetch from Supabase at request time with a 1-hour revalidation cache (`revalidate = 3600`). Occupancy metrics (weekend/weekday/total, monthly breakdowns) are computed in `src/lib/queries.ts` from raw availability records.

## Project Structure

```
dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with nav + theme provider
│   │   ├── page.tsx                # Overview page
│   │   ├── globals.css             # Tailwind + shadcn theme variables
│   │   └── properties/
│   │       ├── page.tsx            # Properties table
│   │       └── [id]/page.tsx       # Property detail
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── occupancy-chart.tsx     # Monthly bar chart (Recharts)
│   │   ├── calendar-heatmap.tsx    # Daily availability grid
│   │   ├── top-properties-table.tsx
│   │   ├── theme-provider.tsx      # next-themes wrapper
│   │   └── theme-toggle.tsx        # Light/dark toggle button
│   └── lib/
│       ├── supabase.ts             # Supabase client init
│       ├── queries.ts              # Data fetching + computation
│       └── utils.ts                # shadcn cn() utility
├── package.json
└── .env.local                      # Local Supabase credentials (gitignored)
```
