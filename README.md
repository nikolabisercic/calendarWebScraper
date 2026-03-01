# Rental Property Occupancy Tracker

Tracks daily occupancy of 23 rental properties from weekendica.com to evaluate investment potential. Runs automatically via GitHub Actions and displays analytics on a live dashboard.

## Architecture

```
┌─────────────────┐       ┌──────────────┐       ┌──────────────────┐
│  GitHub Actions  │──────▶│   Supabase   │◀──────│  Vercel (Next.js)│
│  (twice daily)   │ write │  PostgreSQL  │  read │  Dashboard       │
│  scraper script  │       │  (free tier) │       │  shadcn/ui       │
└─────────────────┘       └──────────────┘       └──────────────────┘
```

- **Scraper**: Python script runs at 8 AM + 8 PM CET via GitHub Actions cron
- **Database**: Supabase PostgreSQL stores properties and daily availability records
- **Dashboard**: Next.js app on Vercel with shadcn/ui — auto-deploys on push

## How It Works

### Scraping

1. Read property URLs from Supabase (or Excel locally)
2. Fetch each property page via `requests.Session` (TCP reuse across 23 requests)
3. Parse `<li data-date="...">` calendar elements — if `rz--available` is in the class list it's available, otherwise it's booked
4. Collect today's and tomorrow's availability into a batch
5. Upsert to Supabase (and optionally Excel)

### Storage Modes

Controlled by `STORAGE_MODE` environment variable:

| Mode      | Excel | Supabase | Use case                        |
| --------- | ----- | -------- | ------------------------------- |
| `both`    | Yes   | Yes      | Local development (default)     |
| `db_only` | No    | Yes      | GitHub Actions CI               |

### Detection Logic

```html
<!-- Available: class contains "rz--available" -->
<li class="rz--future-day rz--available" data-date="29-04-2026">

<!-- Booked: class does NOT contain "rz--available" -->
<li class="rz--future-day rz--day-unavailable rz--not-available" data-date="30-04-2026">
```

Calendar data is in static HTML — no headless browser needed.

## Dashboard

Live at the Vercel deployment URL. Three views:

- **Overview** — KPI cards (total/weekend/weekday occupancy), monthly trend chart, top 5 properties
- **Properties** — Sortable table of all 23 properties ranked by occupancy
- **Property Detail** — Per-property monthly bar chart and daily calendar heatmap

Supports light and dark themes.

See [`dashboard/README.md`](dashboard/README.md) for development setup.

## Local Development

### Setup

```bash
python3 -m venv ~/envs/calendarScraper
source ~/envs/calendarScraper/bin/activate
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-secret-key
STORAGE_MODE=both
```

### Run Scraper

```bash
python scrape_availability.py
```

### Expected Output

```
INFO - Starting occupancy scraper (storage: both)
INFO - Found 23 properties
INFO - Target dates: ['2026-03-01', '2026-03-02']
INFO - Fetching: https://www.weekendica.com/vikendica/...
...
INFO - Successfully scraped 23/23 properties
INFO - Availability batch update: 46 updated, 0 inserted
INFO - Supabase upsert: 46 rows
INFO - Scraper finished
```

## Database Schema

### `properties`

| Column            | Type    | Description                          |
| ----------------- | ------- | ------------------------------------ |
| id                | integer | Primary key (1-23)                   |
| url               | text    | weekendica.com property URL          |
| lokacija          | text    | Location                             |
| kapacitet_kuce    | text    | House capacity                       |
| + amenity columns | boolean | Pool size, jacuzzi, summer kitchen…  |

### `availability`

| Column      | Type      | Description                       |
| ----------- | --------- | --------------------------------- |
| id          | serial    | Auto-increment PK                 |
| property_id | integer   | FK to properties                  |
| date        | date      | The date checked                  |
| booked      | boolean   | true = booked, false = available  |
| checked_at  | timestamp | When the scraper ran              |

Unique constraint on `(property_id, date)` — upserts on conflict.

## File Structure

```
calendarWebScraper/
├── scrape_availability.py          # Main scraper (dual storage: Excel + Supabase)
├── requirements.txt                # Python dependencies
├── seed_database.py                # One-time migration: Excel → Supabase
├── KuceZaIzdavanje.xlsx            # Local Excel data file
├── analyze_data.ipynb              # Jupyter notebook for analysis
├── validate_scraping.py            # Validation: checks 5 properties
├── validate_all_properties.py      # Validation: scans all 23 properties
├── .github/workflows/scrape.yml    # GitHub Actions cron (twice daily)
├── supabase/
│   ├── config.toml                 # Supabase CLI config
│   └── migrations/                 # SQL migrations
├── dashboard/                      # Next.js analytics dashboard
│   ├── src/app/                    # App Router pages
│   ├── src/components/             # UI components (shadcn/ui + charts)
│   └── src/lib/                    # Supabase client + data queries
└── README.md
```

## GitHub Actions

The workflow at `.github/workflows/scrape.yml` runs twice daily:

- **Schedule**: `0 7,19 * * *` (7 AM + 7 PM UTC = 8 AM + 8 PM CET)
- **Manual trigger**: Available via `workflow_dispatch` in the Actions tab
- **Secrets required**: `SUPABASE_URL`, `SUPABASE_KEY`
