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
2. For each property:
   - Fetch the page HTML
   - Parse all `<li data-date="...">` calendar elements
   - Extract TODAY's and TOMORROW's availability status
3. Update/insert records in the Availability sheet
4. Recalculate occupancy summaries in Properties sheet

### Why Today + Tomorrow?

- **Today**: Captures definitive occupancy for the current day
- **Tomorrow**: Provides backup data if you miss running the script one day

### Update Logic

- If (property_id, date) exists → UPDATE the record
- If not → INSERT new record
- This prevents duplicate rows and keeps data clean

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
INFO - Target dates: ['2026-01-19', '2026-01-20']
INFO - Fetching: https://www.weekendica.com/vikendica/...
...
INFO - Successfully scraped 23/23 properties
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
├── scrape_availability.py   # Main scraper script
├── requirements.txt         # Python dependencies
├── KuceZaIzdavanje.xlsx     # Data file (Properties + Availability sheets)
├── analyze_data.ipynb       # Jupyter notebook for analysis
└── README.md                # This file
```

## Notes

- The scraper includes a 1-second delay between requests to be polite to the server
- Properties with failed requests are skipped (logged as warnings)
- Monthly occupancy columns are added automatically as new months are scraped
