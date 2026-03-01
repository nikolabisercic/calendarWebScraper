# Rental Property Occupancy Tracker

A Python scraper that tracks daily occupancy of rental properties from weekendica.com to help evaluate investment potential.

## Overview

This tool scrapes availability calendars from 23 rental properties and stores the data in an Excel file. Running it daily builds a historical dataset for occupancy analysis.

## HTML Structure (weekendica.com)

The availability calendar on each property page uses `<li>` elements with specific CSS classes:

```html
<!-- Available date -->
<li
  class="rz--future-day rz--available"
  data-timestamp="1777420800"
  data-date="29-04-2026"
>
  <span
    ><i>29</i>
    <div class="cal-price">
      <span class="rz--amount">170.00</span>
      <span class="rz--currency">€</span>
    </div>
  </span>
</li>

<!-- Booked/Unavailable date -->
<li
  class="rz--future-day rz--day-unavailable rz--not-available rz--unavailable-start"
  data-timestamp="1777507200"
  data-date="30-04-2026"
>
  <span
    ><i>30</i>
    <div class="cal-price">
      <span class="rz--amount">170.00</span>
      <span class="rz--currency">€</span>
    </div>
  </span>
</li>
```

**Key attributes:**

- `data-date`: Date in DD-MM-YYYY format
- `rz--available`: Present when date is available for booking
- `rz--not-available` / `rz--day-unavailable`: Present when date is booked

**Detection logic:** If `rz--available` is in the class list → available (booked=0), otherwise → booked (booked=1)

## Scraping Approach

### Daily Scrape Flow

1. Read property URLs from Excel (Properties sheet)
2. Create a `requests.Session` (reuses TCP connections across all 23 requests to the same host)
3. For each property:
   - Fetch the page HTML via the shared session
   - Parse all `<li data-date="...">` calendar elements
   - Collect TODAY's and TOMORROW's availability status into a list
4. Batch write all collected records to the Availability sheet (single file open/save)
5. Recalculate occupancy summaries in Properties sheet

### Why Today + Tomorrow?

- **Today**: Captures definitive occupancy for the current day
- **Tomorrow**: Provides backup data if you miss running the script one day

### Batch Update Logic

All availability updates are collected in memory during the scraping loop, then written to Excel in a single batch operation. This avoids opening/saving the workbook once per record (which would be 46 cycles for 23 properties × 2 dates).

The batch function builds a `dict` index of existing `(property_id, date) → row_number` in one pass over the sheet, enabling O(1) lookups for deduplication:

- If `(property_id, date)` exists → UPDATE the record in place
- If not → INSERT new record
- Newly inserted rows are added to the index, preventing duplicates within the same batch

This means running the scraper twice on the same day produces `46 updated, 0 inserted` — no duplicate rows.

## Excel Output Format

### Sheet 1: Properties (static info + analytics)

| Column          | Description                                                |
| --------------- | ---------------------------------------------------------- |
| A: ID           | Property identifier (1-23)                                 |
| B: Vikendice    | Property URL                                               |
| C: Lokacija     | Location                                                   |
| D-J             | Property attributes (pool size, capacity, amenities, etc.) |
| K: Occ_Weekend  | Occupancy % for Fri/Sat/Sun                                |
| L: Occ_Weekday  | Occupancy % for Mon-Thu                                    |
| M: Occ_Total    | Overall occupancy %                                        |
| N: Rank         | Ranking by total occupancy (1 = highest)                   |
| O+: Occ_YYYY-MM | Monthly occupancy columns (stack as months pass)           |

### Sheet 2: Availability (raw daily data)

| Column        | Description                           |
| ------------- | ------------------------------------- |
| property_id   | Maps to ID in Properties sheet (1-23) |
| date          | YYYY-MM-DD format                     |
| booked        | 1 = booked, 0 = available             |
| checked_at    | Timestamp when data was scraped       |
| day_of_week   | Monday, Tuesday, etc.                 |
| month_of_year | January, February, etc.               |

## Setup

### Create virtual environment

```bash
python3 -m venv /path/to/envs/calendarScraper
```

### Install dependencies

```bash
/path/to/envs/calendarScraper/bin/pip install -r requirements.txt
```

## Usage

### Run the scraper

```bash
/path/to/envs/calendarScraper/bin/python scrape_availability.py
```

### Expected output

```
INFO - Starting occupancy scraper
INFO - Found 23 properties
INFO - Target dates: ['2026-03-01', '2026-03-02']
INFO - Fetching: https://www.weekendica.com/vikendica/...
...
INFO - Successfully scraped 23/23 properties
INFO - Availability batch update: 46 updated, 0 inserted
INFO - Occupancy summaries updated
INFO - Scraper finished
```

## Data Analysis

Use the included Jupyter notebook for analysis:

```bash
jupyter notebook analyze_data.ipynb
```

Or with pandas:

```python
import pandas as pd

# Load data
props = pd.read_excel('KuceZaIzdavanje.xlsx', sheet_name='Properties')
avail = pd.read_excel('KuceZaIzdavanje.xlsx', sheet_name='Availability')

# Occupancy by location
props.groupby('Lokacija')['Occ_Total'].mean()

# Weekend vs weekday comparison
props[['Lokacija', 'Occ_Weekend', 'Occ_Weekday']]
```

## File Structure

```
calendarWebScraper/
├── scrape_availability.py        # Main scraper script
├── requirements.txt              # Python dependencies
├── KuceZaIzdavanje.xlsx          # Data file (Properties + Availability sheets)
├── analyze_data.ipynb            # Jupyter notebook for analysis
├── validate_scraping.py          # Validation: checks 5 properties for correct parsing
├── validate_all_properties.py    # Validation: scans all 23 properties for bookings
└── README.md                     # This file
```

## Architecture Notes

### HTTP Session Reuse

All 23 requests go to the same host (`weekendica.com`). The scraper uses a single `requests.Session` so TCP connections are reused across requests rather than opening a new connection each time.

### Occupancy Summary Calculation

The `calculate_occupancy_summaries()` function computes several metrics with pandas (weekend/weekday/total/monthly occupancy, rankings) and writes them back to the Properties sheet using a `write_column()` helper. Each metric is a single call:

```python
write_column("Occ_Weekend", weekend_occ)
write_column("Occ_Weekday", weekday_occ)
write_column("Occ_Total", total_occ)
write_column("Rank", rankings, formatter=lambda v: int(v), fallback="-")
```

Monthly columns are generated dynamically and stack as new months are scraped.

## Notes

- The scraper includes a 1-second delay between requests to be polite to the server
- Properties with failed requests are skipped (logged as warnings)
- Monthly occupancy columns are added automatically as new months are scraped
- The calendar data is present in the static HTML (no JavaScript rendering needed) — `requests.get()` is sufficient, no headless browser required
