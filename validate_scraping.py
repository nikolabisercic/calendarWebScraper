#!/usr/bin/env python3
"""
Validation script - checks if the scraping logic correctly identifies
booked vs available dates from weekendica.com calendar pages.

This does NOT modify any existing files.
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime
import sys

URLS_TO_TEST = [
    (1, "https://www.weekendica.com/vikendica/dunavska-magija/"),
    (5, "https://www.weekendica.com/vikendica/vikendica-gaj/"),
    (10, "https://www.weekendica.com/vikendica/vila-piano/"),
    (17, "https://www.weekendica.com/vikendica/the-palm-pool-villa/"),
    (23, "https://www.weekendica.com/vikendica/vila-lipovica/"),
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}


def analyze_property(prop_id: int, url: str):
    """Fetch a property page and analyze calendar HTML structure."""
    print(f"\n{'='*70}")
    print(f"Property {prop_id}: {url}")
    print(f"{'='*70}")

    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    html = response.text

    soup = BeautifulSoup(html, "html.parser")

    # 1. Check for <li> elements with data-date attribute
    calendar_days = soup.find_all("li", attrs={"data-date": True})
    print(f"\nTotal <li data-date> elements found: {len(calendar_days)}")

    if not calendar_days:
        print("WARNING: No calendar day elements found!")
        # Let's check what other calendar-related elements exist
        print("\nSearching for alternative calendar structures...")

        # Check for any element with data-date
        any_data_date = soup.find_all(attrs={"data-date": True})
        print(f"  Any element with data-date: {len(any_data_date)}")
        for el in any_data_date[:3]:
            print(f"    Tag: <{el.name}>, classes: {el.get('class', [])}, data-date: {el.get('data-date')}")

        # Check for rz-- prefixed classes
        rz_elements = soup.find_all(class_=lambda c: c and any("rz--" in cls for cls in (c if isinstance(c, list) else [c])))
        print(f"  Elements with rz-- classes: {len(rz_elements)}")
        for el in rz_elements[:5]:
            print(f"    Tag: <{el.name}>, classes: {el.get('class', [])}")

        # Check for calendar-related divs/containers
        cal_containers = soup.find_all(class_=lambda c: c and any("calendar" in cls.lower() for cls in (c if isinstance(c, list) else [c])))
        print(f"  Elements with 'calendar' class: {len(cal_containers)}")
        for el in cal_containers[:5]:
            print(f"    Tag: <{el.name}>, classes: {el.get('class', [])}")

        # Save raw HTML for manual inspection
        filename = f"raw_html_property_{prop_id}.html"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"\n  Raw HTML saved to {filename} for manual inspection")
        return

    # 2. Categorize days
    available_days = []
    booked_days = []
    ambiguous_days = []

    for day in calendar_days:
        date_str = day.get("data-date")
        classes = day.get("class", [])

        has_available = "rz--available" in classes
        has_not_available = "rz--not-available" in classes
        has_day_unavailable = "rz--day-unavailable" in classes

        # Apply same logic as scraper: booked = "rz--available" NOT in classes
        is_booked_by_scraper = "rz--available" not in classes

        entry = {
            "date_raw": date_str,
            "classes": classes,
            "has_available": has_available,
            "has_not_available": has_not_available,
            "has_day_unavailable": has_day_unavailable,
            "scraper_says_booked": is_booked_by_scraper,
        }

        if has_available and not has_not_available:
            available_days.append(entry)
        elif has_not_available or has_day_unavailable:
            booked_days.append(entry)
        else:
            ambiguous_days.append(entry)

    print(f"\nAvailable days (rz--available present): {len(available_days)}")
    print(f"Booked days (rz--not-available or rz--day-unavailable): {len(booked_days)}")
    print(f"Ambiguous days (neither clear signal): {len(ambiguous_days)}")

    # 3. Show sample available days
    print(f"\n--- Sample AVAILABLE days (first 3) ---")
    for entry in available_days[:3]:
        print(f"  Date: {entry['date_raw']}")
        print(f"  Classes: {entry['classes']}")
        print(f"  Scraper would mark as booked: {entry['scraper_says_booked']}")
        print()

    # 4. Show sample booked days
    print(f"--- Sample BOOKED days (first 3) ---")
    for entry in booked_days[:3]:
        print(f"  Date: {entry['date_raw']}")
        print(f"  Classes: {entry['classes']}")
        print(f"  Scraper would mark as booked: {entry['scraper_says_booked']}")
        print()

    # 5. Show ambiguous days (potential issues)
    if ambiguous_days:
        print(f"--- AMBIGUOUS days (first 5) - POTENTIAL ISSUE ---")
        for entry in ambiguous_days[:5]:
            print(f"  Date: {entry['date_raw']}")
            print(f"  Classes: {entry['classes']}")
            print(f"  Scraper would mark as booked: {entry['scraper_says_booked']}")
            print()

    # 6. Collect all unique class combinations
    class_combos = set()
    for day in calendar_days:
        classes = day.get("class", [])
        rz_classes = sorted([c for c in classes if c.startswith("rz--")])
        class_combos.add(tuple(rz_classes))

    print(f"--- All unique rz-- class combinations ---")
    for combo in sorted(class_combos):
        print(f"  {list(combo)}")

    # 7. Check date format
    print(f"\n--- Date format check (first 3 raw dates) ---")
    for day in calendar_days[:3]:
        raw = day.get("data-date")
        try:
            parsed = datetime.strptime(raw, "%d-%m-%Y")
            print(f"  Raw: {raw} -> Parsed: {parsed.strftime('%Y-%m-%d')} OK")
        except ValueError as e:
            print(f"  Raw: {raw} -> PARSE ERROR: {e}")

    # 8. Check today and tomorrow specifically
    from datetime import timedelta
    today = datetime.now()
    tomorrow = today + timedelta(days=1)
    today_str_dd = today.strftime("%d-%m-%Y")
    tomorrow_str_dd = tomorrow.strftime("%d-%m-%Y")

    print(f"\n--- Today ({today_str_dd}) and Tomorrow ({tomorrow_str_dd}) ---")
    for day in calendar_days:
        raw = day.get("data-date")
        if raw in (today_str_dd, tomorrow_str_dd):
            classes = day.get("class", [])
            is_booked = "rz--available" not in classes
            label = "TODAY" if raw == today_str_dd else "TOMORROW"
            print(f"  {label}: date={raw}, classes={classes}")
            print(f"    Scraper would mark booked={is_booked}")


if __name__ == "__main__":
    for prop_id, url in URLS_TO_TEST:
        try:
            analyze_property(prop_id, url)
        except Exception as e:
            print(f"\nERROR for property {prop_id}: {e}")
        print()
