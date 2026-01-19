#!/usr/bin/env python3
"""
Rental Property Occupancy Tracker

Scrapes availability data from weekendica.com properties and stores it in Excel.
Run daily to build historical occupancy data.
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
from openpyxl import load_workbook
from datetime import datetime, timedelta
import logging
import time
from pathlib import Path

# Configuration
EXCEL_FILE = Path(__file__).parent / "KuceZaIzdavanje.xlsx"
PROPERTIES_SHEET = "Properties"
AVAILABILITY_SHEET = "Availability"
REQUEST_DELAY = 1  # seconds between requests to be polite to the server

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def setup_excel_structure():
    """Ensure Excel file has correct structure with ID column and Availability sheet."""
    logger.info(f"Checking Excel structure: {EXCEL_FILE}")

    # Load workbook
    wb = load_workbook(EXCEL_FILE)

    # Get first sheet (properties data)
    first_sheet = wb.active
    first_sheet.title = PROPERTIES_SHEET

    # Check if ID column exists (should be column A)
    has_id_column = first_sheet.cell(row=1, column=1).value == "ID"

    if not has_id_column:
        logger.info("Adding ID column to Properties sheet")
        # Insert new column A for ID
        first_sheet.insert_cols(1)
        first_sheet.cell(row=1, column=1, value="ID")

        # Add IDs (1-indexed, starting from row 2)
        for row_num in range(2, first_sheet.max_row + 1):
            first_sheet.cell(row=row_num, column=1, value=row_num - 1)

    # Create Availability sheet if it doesn't exist
    if AVAILABILITY_SHEET not in wb.sheetnames:
        logger.info("Creating Availability sheet")
        avail_sheet = wb.create_sheet(AVAILABILITY_SHEET)
        # Add headers
        headers = ["property_id", "date", "booked", "checked_at", "day_of_week", "month_of_year"]
        for col, header in enumerate(headers, 1):
            avail_sheet.cell(row=1, column=col, value=header)

    wb.save(EXCEL_FILE)
    logger.info("Excel structure verified/updated")


def get_properties() -> list[dict]:
    """Read properties from Excel and return list with ID and URL."""
    df = pd.read_excel(EXCEL_FILE, sheet_name=PROPERTIES_SHEET)

    # URL column is "Vikendice" (second column after ID)
    url_col = "Vikendice" if "Vikendice" in df.columns else df.columns[1]

    properties = []
    for _, row in df.iterrows():
        # Skip rows with missing ID or URL
        if pd.isna(row["ID"]) or pd.isna(row[url_col]):
            continue

        url = str(row[url_col])

        # Only include valid weekendica.com URLs
        if not url.startswith("https://www.weekendica.com/"):
            continue

        properties.append({
            "id": int(row["ID"]),
            "url": url
        })

    return properties


def fetch_calendar_data(url: str) -> dict[str, bool]:
    """
    Fetch property page and parse calendar availability.

    Returns dict: {date_str: is_booked} e.g., {"2026-01-19": True, "2026-01-20": False}
    """
    logger.info(f"Fetching: {url}")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Failed to fetch {url}: {e}")
        return {}

    soup = BeautifulSoup(response.text, "html.parser")

    # Find all calendar day elements
    # Available: class contains "rz--available"
    # Booked: class contains "rz--not-available" or "rz--day-unavailable"
    calendar_days = soup.find_all("li", attrs={"data-date": True})

    availability = {}
    for day in calendar_days:
        date_str = day.get("data-date")  # Format: "29-04-2026"
        if not date_str:
            continue

        # Convert from DD-MM-YYYY to YYYY-MM-DD
        try:
            date_obj = datetime.strptime(date_str, "%d-%m-%Y")
            date_iso = date_obj.strftime("%Y-%m-%d")
        except ValueError:
            continue

        # Check if booked (not available)
        classes = day.get("class", [])
        is_booked = "rz--available" not in classes

        availability[date_iso] = is_booked

    return availability


def get_target_dates() -> list[str]:
    """Get today and tomorrow's dates in YYYY-MM-DD format."""
    today = datetime.now()
    tomorrow = today + timedelta(days=1)
    return [
        today.strftime("%Y-%m-%d"),
        tomorrow.strftime("%Y-%m-%d")
    ]


def update_availability(property_id: int, date: str, booked: bool):
    """Update or insert availability record in Excel."""
    wb = load_workbook(EXCEL_FILE)
    sheet = wb[AVAILABILITY_SHEET]

    # Convert date to day_of_week and month_of_year
    date_obj = datetime.strptime(date, "%Y-%m-%d")
    day_of_week = date_obj.strftime("%A")
    month_of_year = date_obj.strftime("%B")
    checked_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Search for existing row with same property_id and date
    existing_row = None
    for row_num in range(2, sheet.max_row + 1):
        if (sheet.cell(row=row_num, column=1).value == property_id and
            str(sheet.cell(row=row_num, column=2).value) == date):
            existing_row = row_num
            break

    if existing_row:
        # Update existing row
        sheet.cell(row=existing_row, column=3, value=1 if booked else 0)
        sheet.cell(row=existing_row, column=4, value=checked_at)
        sheet.cell(row=existing_row, column=5, value=day_of_week)
        sheet.cell(row=existing_row, column=6, value=month_of_year)
        logger.debug(f"Updated: property {property_id}, date {date}, booked={booked}")
    else:
        # Insert new row
        new_row = sheet.max_row + 1
        sheet.cell(row=new_row, column=1, value=property_id)
        sheet.cell(row=new_row, column=2, value=date)
        sheet.cell(row=new_row, column=3, value=1 if booked else 0)
        sheet.cell(row=new_row, column=4, value=checked_at)
        sheet.cell(row=new_row, column=5, value=day_of_week)
        sheet.cell(row=new_row, column=6, value=month_of_year)
        logger.debug(f"Inserted: property {property_id}, date {date}, booked={booked}")

    wb.save(EXCEL_FILE)


def calculate_occupancy_summaries():
    """Calculate monthly occupancy percentages and update Properties sheet."""
    logger.info("Calculating occupancy summaries")

    # Read availability data
    try:
        avail_df = pd.read_excel(EXCEL_FILE, sheet_name=AVAILABILITY_SHEET)
    except Exception:
        logger.warning("No availability data yet, skipping summary calculation")
        return

    if avail_df.empty:
        return

    # Convert date column to datetime
    avail_df["date"] = pd.to_datetime(avail_df["date"])
    avail_df["year_month"] = avail_df["date"].dt.to_period("M")

    # Calculate occupancy per property per month
    monthly_occ = avail_df.groupby(["property_id", "year_month"])["booked"].mean()

    # Calculate weekend vs weekday occupancy
    weekend_days = ["Friday", "Saturday", "Sunday"]
    weekday_days = ["Monday", "Tuesday", "Wednesday", "Thursday"]

    weekend_df = avail_df[avail_df["day_of_week"].isin(weekend_days)]
    weekday_df = avail_df[avail_df["day_of_week"].isin(weekday_days)]

    weekend_occ = weekend_df.groupby("property_id")["booked"].mean() if not weekend_df.empty else pd.Series(dtype=float)
    weekday_occ = weekday_df.groupby("property_id")["booked"].mean() if not weekday_df.empty else pd.Series(dtype=float)

    # Calculate total occupancy per property
    total_occ = avail_df.groupby("property_id")["booked"].mean()

    # Calculate rankings (1 = highest occupancy)
    rankings = total_occ.rank(ascending=False, method="min").astype(int)

    # Load workbook to update Properties sheet
    wb = load_workbook(EXCEL_FILE)
    props_sheet = wb[PROPERTIES_SHEET]

    # Find existing occupancy columns or add new ones
    header_row = 1
    existing_headers = [props_sheet.cell(row=header_row, column=col).value
                       for col in range(1, props_sheet.max_column + 1)]

    # Helper function to get or create column
    def get_or_create_col(col_name):
        if col_name in existing_headers:
            return existing_headers.index(col_name) + 1
        else:
            col_idx = props_sheet.max_column + 1
            props_sheet.cell(row=header_row, column=col_idx, value=col_name)
            existing_headers.append(col_name)
            return col_idx

    # Add weekend occupancy column (summary columns first, before monthly)
    weekend_col_idx = get_or_create_col("Occ_Weekend")
    for row_num in range(2, props_sheet.max_row + 1):
        prop_id = props_sheet.cell(row=row_num, column=1).value
        if prop_id is None:
            continue
        try:
            occ_rate = weekend_occ.get(prop_id, 0) if prop_id in weekend_occ.index else 0
            props_sheet.cell(row=row_num, column=weekend_col_idx, value=f"{occ_rate:.0%}")
        except (KeyError, TypeError):
            props_sheet.cell(row=row_num, column=weekend_col_idx, value="0%")

    # Add weekday occupancy column
    weekday_col_idx = get_or_create_col("Occ_Weekday")
    for row_num in range(2, props_sheet.max_row + 1):
        prop_id = props_sheet.cell(row=row_num, column=1).value
        if prop_id is None:
            continue
        try:
            occ_rate = weekday_occ.get(prop_id, 0) if prop_id in weekday_occ.index else 0
            props_sheet.cell(row=row_num, column=weekday_col_idx, value=f"{occ_rate:.0%}")
        except (KeyError, TypeError):
            props_sheet.cell(row=row_num, column=weekday_col_idx, value="0%")

    # Add total occupancy column
    total_col_idx = get_or_create_col("Occ_Total")
    for row_num in range(2, props_sheet.max_row + 1):
        prop_id = props_sheet.cell(row=row_num, column=1).value
        if prop_id is None:
            continue
        try:
            occ_rate = total_occ.get(prop_id, 0)
            props_sheet.cell(row=row_num, column=total_col_idx, value=f"{occ_rate:.0%}")
        except (KeyError, TypeError):
            props_sheet.cell(row=row_num, column=total_col_idx, value="0%")

    # Add ranking column
    rank_col_idx = get_or_create_col("Rank")
    for row_num in range(2, props_sheet.max_row + 1):
        prop_id = props_sheet.cell(row=row_num, column=1).value
        if prop_id is None:
            continue
        try:
            rank = rankings.get(prop_id, 0) if prop_id in rankings.index else 0
            props_sheet.cell(row=row_num, column=rank_col_idx, value=int(rank) if rank > 0 else "-")
        except (KeyError, TypeError):
            props_sheet.cell(row=row_num, column=rank_col_idx, value="-")

    # Add monthly occupancy columns (at the end, so they stack as new months are added)
    unique_months = sorted(avail_df["year_month"].unique())
    for month in unique_months:
        month_str = str(month)  # e.g., "2026-01"
        col_name = f"Occ_{month_str}"
        col_idx = get_or_create_col(col_name)

        for row_num in range(2, props_sheet.max_row + 1):
            prop_id = props_sheet.cell(row=row_num, column=1).value
            if prop_id is None:
                continue
            try:
                occ_rate = monthly_occ.get((prop_id, month), 0)
                props_sheet.cell(row=row_num, column=col_idx, value=f"{occ_rate:.0%}")
            except (KeyError, TypeError):
                props_sheet.cell(row=row_num, column=col_idx, value="0%")

    wb.save(EXCEL_FILE)
    logger.info("Occupancy summaries updated")


def main():
    """Main entry point for the scraper."""
    logger.info("=" * 50)
    logger.info("Starting occupancy scraper")
    logger.info("=" * 50)

    # Ensure Excel structure is correct
    setup_excel_structure()

    # Get list of properties
    properties = get_properties()
    logger.info(f"Found {len(properties)} properties")

    # Get target dates (today and tomorrow)
    target_dates = get_target_dates()
    logger.info(f"Target dates: {target_dates}")

    # Scrape each property
    success_count = 0
    for prop in properties:
        prop_id = prop["id"]
        url = prop["url"]

        # Fetch calendar data
        calendar_data = fetch_calendar_data(url)

        if not calendar_data:
            logger.warning(f"No calendar data for property {prop_id}")
            continue

        # Update availability for target dates
        for date in target_dates:
            if date in calendar_data:
                booked = calendar_data[date]
                update_availability(prop_id, date, booked)
            else:
                logger.warning(f"Date {date} not found in calendar for property {prop_id}")

        success_count += 1

        # Be polite to the server
        time.sleep(REQUEST_DELAY)

    logger.info(f"Successfully scraped {success_count}/{len(properties)} properties")

    # Calculate and update occupancy summaries
    calculate_occupancy_summaries()

    logger.info("Scraper finished")


if __name__ == "__main__":
    main()
