#!/usr/bin/env python3
"""
Quick scan of ALL 23 properties to check for booked dates across the full calendar.
Focuses on summer months (May-Sep) to verify bookings are detected.
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pandas as pd
import time
from collections import defaultdict

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

df = pd.read_excel("KuceZaIzdavanje.xlsx", sheet_name="Properties")

results = []

for _, row in df.iterrows():
    prop_id = int(row["ID"])
    url = str(row["Vikendice"])

    if not url.startswith("https://www.weekendica.com/"):
        continue

    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        calendar_days = soup.find_all("li", attrs={"data-date": True})
        total = len(calendar_days)

        booked_dates = []
        available_dates = []
        for day in calendar_days:
            date_str = day.get("data-date")
            classes = day.get("class", [])
            is_booked = "rz--available" not in classes

            try:
                date_obj = datetime.strptime(date_str, "%d-%m-%Y")
            except ValueError:
                continue

            if is_booked:
                booked_dates.append(date_obj)
            else:
                available_dates.append(date_obj)

        # Group booked dates by month
        booked_by_month = defaultdict(int)
        for d in booked_dates:
            booked_by_month[d.strftime("%Y-%m")] += 1

        print(f"Property {prop_id:2d}: {total} days, {len(booked_dates)} booked, {len(available_dates)} available", end="")
        if booked_dates:
            months_str = ", ".join(f"{m}({c})" for m, c in sorted(booked_by_month.items()))
            print(f"  | Booked months: {months_str}")
        else:
            print()

        results.append({
            "id": prop_id,
            "total_days": total,
            "booked": len(booked_dates),
            "available": len(available_dates),
            "booked_by_month": dict(booked_by_month),
        })

    except Exception as e:
        print(f"Property {prop_id:2d}: ERROR - {e}")

    time.sleep(0.5)

# Summary
print(f"\n{'='*60}")
print("SUMMARY")
print(f"{'='*60}")
total_booked = sum(r["booked"] for r in results)
total_days = sum(r["total_days"] for r in results)
props_with_bookings = sum(1 for r in results if r["booked"] > 0)
print(f"Properties scanned: {len(results)}")
print(f"Properties with ANY bookings: {props_with_bookings}")
print(f"Total booked day-entries: {total_booked} / {total_days}")

# Aggregate by month
all_months = defaultdict(int)
for r in results:
    for m, c in r["booked_by_month"].items():
        all_months[m] += c

if all_months:
    print(f"\nBooked days across all properties by month:")
    for m, c in sorted(all_months.items()):
        print(f"  {m}: {c} booked days")
