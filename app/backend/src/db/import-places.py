#!/usr/bin/env python3
"""
Import places from DuckDB files into PostgreSQL.
Reads all places_XX.duckdb files and bulk-inserts into the nearnow4 database.
"""

import os
import sys
import time
import duckdb
import psycopg2
from psycopg2.extras import execute_values

DB_DIR = os.environ.get('DUCKDB_DIR', os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'data'))
PG_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5847/nearnow4')

# Country metadata for seeding
COUNTRIES = {
    'AT': {'name': 'Austria',       'currency': 'EUR', 'tz': 'Europe/Vienna',       'flag': '🇦🇹', 'budget': 80},
    'AU': {'name': 'Australia',     'currency': 'AUD', 'tz': 'Australia/Sydney',    'flag': '🇦🇺', 'budget': 70},
    'BD': {'name': 'Bangladesh',    'currency': 'BDT', 'tz': 'Asia/Dhaka',          'flag': '🇧🇩', 'budget': 15},
    'CH': {'name': 'Switzerland',   'currency': 'CHF', 'tz': 'Europe/Zurich',       'flag': '🇨🇭', 'budget': 120},
    'DE': {'name': 'Germany',       'currency': 'EUR', 'tz': 'Europe/Berlin',       'flag': '🇩🇪', 'budget': 70},
    'EG': {'name': 'Egypt',         'currency': 'EGP', 'tz': 'Africa/Cairo',        'flag': '🇪🇬', 'budget': 25},
    'ES': {'name': 'Spain',         'currency': 'EUR', 'tz': 'Europe/Madrid',       'flag': '🇪🇸', 'budget': 55},
    'FR': {'name': 'France',        'currency': 'EUR', 'tz': 'Europe/Paris',        'flag': '🇫🇷', 'budget': 65},
    'GR': {'name': 'Greece',        'currency': 'EUR', 'tz': 'Europe/Athens',       'flag': '🇬🇷', 'budget': 50},
    'ID': {'name': 'Indonesia',     'currency': 'IDR', 'tz': 'Asia/Jakarta',        'flag': '🇮🇩', 'budget': 28},
    'IN': {'name': 'India',         'currency': 'INR', 'tz': 'Asia/Kolkata',        'flag': '🇮🇳', 'budget': 25},
    'IT': {'name': 'Italy',         'currency': 'EUR', 'tz': 'Europe/Rome',         'flag': '🇮🇹', 'budget': 60},
    'JP': {'name': 'Japan',         'currency': 'JPY', 'tz': 'Asia/Tokyo',          'flag': '🇯🇵', 'budget': 65},
    'LK': {'name': 'Sri Lanka',     'currency': 'LKR', 'tz': 'Asia/Colombo',        'flag': '🇱🇰', 'budget': 22},
    'MA': {'name': 'Morocco',       'currency': 'MAD', 'tz': 'Africa/Casablanca',   'flag': '🇲🇦', 'budget': 30},
    'MM': {'name': 'Myanmar',       'currency': 'MMK', 'tz': 'Asia/Yangon',         'flag': '🇲🇲', 'budget': 28},
    'MY': {'name': 'Malaysia',      'currency': 'MYR', 'tz': 'Asia/Kuala_Lumpur',   'flag': '🇲🇾', 'budget': 30},
    'NP': {'name': 'Nepal',         'currency': 'NPR', 'tz': 'Asia/Kathmandu',      'flag': '🇳🇵', 'budget': 30},
    'NZ': {'name': 'New Zealand',   'currency': 'NZD', 'tz': 'Pacific/Auckland',    'flag': '🇳🇿', 'budget': 65},
    'PH': {'name': 'Philippines',   'currency': 'PHP', 'tz': 'Asia/Manila',         'flag': '🇵🇭', 'budget': 30},
    'PT': {'name': 'Portugal',      'currency': 'EUR', 'tz': 'Europe/Lisbon',       'flag': '🇵🇹', 'budget': 45},
    'SG': {'name': 'Singapore',     'currency': 'SGD', 'tz': 'Asia/Singapore',      'flag': '🇸🇬', 'budget': 60},
    'TH': {'name': 'Thailand',      'currency': 'THB', 'tz': 'Asia/Bangkok',        'flag': '🇹🇭', 'budget': 35},
    'TR': {'name': 'Turkey',        'currency': 'TRY', 'tz': 'Europe/Istanbul',     'flag': '🇹🇷', 'budget': 35},
    'TW': {'name': 'Taiwan',        'currency': 'TWD', 'tz': 'Asia/Taipei',         'flag': '🇹🇼', 'budget': 40},
    'VN': {'name': 'Vietnam',       'currency': 'VND', 'tz': 'Asia/Ho_Chi_Minh',    'flag': '🇻🇳', 'budget': 22},
}

# Also seed countries that have no DuckDB data but are in the app
EXTRA_COUNTRIES = {
    'KH': {'name': 'Cambodia',      'currency': 'KHR', 'tz': 'Asia/Phnom_Penh',     'flag': '🇰🇭', 'budget': 25},
    'MV': {'name': 'Maldives',      'currency': 'MVR', 'tz': 'Indian/Maldives',     'flag': '🇲🇻', 'budget': 80},
    'AE': {'name': 'UAE',           'currency': 'AED', 'tz': 'Asia/Dubai',          'flag': '🇦🇪', 'budget': 70},
    'GB': {'name': 'United Kingdom','currency': 'GBP', 'tz': 'Europe/London',       'flag': '🇬🇧', 'budget': 80},
    'US': {'name': 'United States', 'currency': 'USD', 'tz': 'America/New_York',    'flag': '🇺🇸', 'budget': 75},
    'MX': {'name': 'Mexico',        'currency': 'MXN', 'tz': 'America/Mexico_City', 'flag': '🇲🇽', 'budget': 35},
    'HK': {'name': 'Hong Kong',     'currency': 'HKD', 'tz': 'Asia/Hong_Kong',      'flag': '🇭🇰', 'budget': 55},
    'KR': {'name': 'South Korea',   'currency': 'KRW', 'tz': 'Asia/Seoul',          'flag': '🇰🇷', 'budget': 50},
}


def clean_name(name):
    """Clean place names that have scraping artifacts (rating/description appended)."""
    if not name:
        return name
    # Many names have pattern: "Name  4.5Hotel · Address\nDescription"
    # Split on double space + digit pattern
    parts = name.split('  ')
    if len(parts) > 1 and parts[0].strip():
        return parts[0].strip()
    return name.strip()


def main():
    print("=" * 60)
    print("  Roam Richer - DuckDB → PostgreSQL Import")
    print("=" * 60)

    # Connect to PostgreSQL
    print(f"\n📡 Connecting to PostgreSQL...")
    conn = psycopg2.connect(PG_URL)
    conn.autocommit = False
    cur = conn.cursor()

    # Step 1: Seed all countries
    print("\n🌍 Seeding countries...")
    all_countries = {**COUNTRIES, **EXTRA_COUNTRIES}
    for code, meta in all_countries.items():
        cur.execute("""
            INSERT INTO countries (code, name, currency, timezone, flag, daily_budget_usd)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (code) DO UPDATE SET
                name = EXCLUDED.name,
                currency = EXCLUDED.currency,
                timezone = EXCLUDED.timezone,
                flag = EXCLUDED.flag,
                daily_budget_usd = EXCLUDED.daily_budget_usd
        """, (code, meta['name'], meta['currency'], meta['tz'], meta['flag'], meta['budget']))
    conn.commit()
    print(f"   ✓ {len(all_countries)} countries seeded")

    # Step 2: Import places from each DuckDB file
    db_dir = os.path.abspath(DB_DIR)
    duckdb_files = sorted([f for f in os.listdir(db_dir) if f.endswith('.duckdb')])
    
    total_imported = 0
    batch_size = 500

    for dbfile in duckdb_files:
        cc = dbfile.replace('places_', '').replace('.duckdb', '')
        dbpath = os.path.join(db_dir, dbfile)
        
        print(f"\n📦 Importing {cc} ({COUNTRIES.get(cc, {}).get('name', cc)})...")
        start = time.time()
        
        duck = duckdb.connect(dbpath, read_only=True)
        rows = duck.execute("""
            SELECT
                google_place_id, name, name_en, slug,
                latitude, longitude,
                country_code, country, city, state_province, district, address,
                main_category, sub_category,
                description, opening_hours, phone, website, email,
                image_url, photos_json,
                rating, review_count, price_level, price, price_currency,
                amenities, source, search_query, search_location, scraped_at
            FROM places
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
              AND name IS NOT NULL AND name != ''
        """).fetchall()
        duck.close()

        # Batch insert into PostgreSQL
        count = 0
        batch = []
        for row in rows:
            cleaned_name = clean_name(row[1])
            if not cleaned_name:
                continue
            batch.append((
                row[0],   # google_place_id
                cleaned_name,  # name (cleaned)
                row[2],   # name_en
                row[3],   # slug
                float(row[4]),  # latitude
                float(row[5]),  # longitude
                row[6],   # country_code
                row[7],   # country
                row[8],   # city
                row[9],   # state_province
                row[10],  # district
                row[11],  # address
                row[12],  # main_category
                row[13],  # sub_category
                row[14],  # description
                row[15],  # opening_hours
                row[16],  # phone
                row[17],  # website
                row[18],  # email
                row[19],  # image_url
                row[20],  # photos_json
                float(row[21]) if row[21] is not None else None,  # rating
                int(row[22]) if row[22] is not None else 0,        # review_count
                int(row[23]) if row[23] is not None else None,     # price_level
                row[24],  # price
                row[25] or 'USD',  # price_currency
                row[26],  # amenities
                row[27] or 'google_maps',  # source
                row[28],  # search_query
                row[29],  # search_location
                str(row[30]) if row[30] else None,  # scraped_at
            ))

            if len(batch) >= batch_size:
                _insert_batch(cur, batch)
                count += len(batch)
                batch = []

        if batch:
            _insert_batch(cur, batch)
            count += len(batch)

        conn.commit()
        
        # Update country place_count
        cur.execute("UPDATE countries SET place_count = %s WHERE code = %s", (count, cc))
        conn.commit()

        elapsed = time.time() - start
        total_imported += count
        print(f"   ✓ {count:,} places in {elapsed:.1f}s")

    # Step 3: Summary
    print(f"\n{'='*60}")
    print(f"  ✅ IMPORT COMPLETE: {total_imported:,} places imported")
    print(f"{'='*60}")

    # Verify
    cur.execute("SELECT COUNT(*) FROM places")
    pg_count = cur.fetchone()[0]
    print(f"\n📊 PostgreSQL places table: {pg_count:,} rows")
    
    cur.execute("SELECT country_code, COUNT(*) FROM places GROUP BY country_code ORDER BY COUNT(*) DESC")
    for row in cur.fetchall():
        print(f"   {row[0]}: {row[1]:,}")

    cur.close()
    conn.close()
    print("\n✨ Done!")


def _insert_batch(cur, batch):
    """Bulk insert a batch of places."""
    sql = """
        INSERT INTO places (
            google_place_id, name, name_en, slug,
            latitude, longitude,
            country_code, country, city, state_province, district, address,
            main_category, sub_category,
            description, opening_hours, phone, website, email,
            image_url, photos_json,
            rating, review_count, price_level, price, price_currency,
            amenities, source, search_query, search_location, scraped_at
        ) VALUES %s
    """
    template = "(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
    execute_values(cur, sql, batch, template=template, page_size=500)


if __name__ == '__main__':
    main()
