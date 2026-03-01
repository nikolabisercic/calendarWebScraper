#!/usr/bin/env python3
"""One-time script to seed Supabase database from the existing Excel file."""

import pandas as pd
from supabase import create_client
import os

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Seed properties ---
print("Seeding properties...")
props_df = pd.read_excel("KuceZaIzdavanje.xlsx", sheet_name="Properties")

col_map = {
    "ID": "id",
    "Vikendice": "url",
    "Lokacija": "lokacija",
    "Veličina bazena": "velicina_bazena",
    "Kapacitet kuće": "kapacitet_kuce",
    "Bolje od naše (izgled dvorišta)": "bolje_dvoriste",
    "Bolje od naše (izgled iznutra)": "bolje_iznutra",
    "Letnja kuhinja": "letnja_kuhinja",
    "Djakuzi": "djakuzi",
    "Promocija proslava": "promocija_proslava",
}

properties = []
for _, row in props_df.iterrows():
    prop = {}
    for excel_col, db_col in col_map.items():
        val = row.get(excel_col)
        if pd.isna(val):
            prop[db_col] = None
        elif db_col == "id":
            prop[db_col] = int(val)
        else:
            prop[db_col] = str(val)
    properties.append(prop)

result = client.table("properties").upsert(properties).execute()
print(f"  Inserted {len(result.data)} properties")

# --- Seed availability ---
print("Seeding availability...")
avail_df = pd.read_excel("KuceZaIzdavanje.xlsx", sheet_name="Availability")

records = []
for _, row in avail_df.iterrows():
    records.append({
        "property_id": int(row["property_id"]),
        "date": str(row["date"])[:10],
        "booked": bool(row["booked"]),
        "checked_at": str(row["checked_at"]),
    })

# Insert in batches of 200
batch_size = 200
for i in range(0, len(records), batch_size):
    batch = records[i:i + batch_size]
    result = client.table("availability").upsert(batch, on_conflict="property_id,date").execute()
    print(f"  Batch {i//batch_size + 1}: upserted {len(result.data)} rows")

print(f"Done! Total: {len(properties)} properties, {len(records)} availability records")
