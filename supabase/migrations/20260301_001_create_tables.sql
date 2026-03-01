-- Properties table (replaces "Properties" Excel sheet)
CREATE TABLE properties (
    id INTEGER PRIMARY KEY,
    url TEXT NOT NULL,
    lokacija TEXT,
    velicina_bazena TEXT,
    kapacitet_kuce TEXT,
    bolje_dvoriste TEXT,
    bolje_iznutra TEXT,
    letnja_kuhinja TEXT,
    djakuzi TEXT,
    promocija_proslava TEXT
);

-- Availability table (replaces "Availability" Excel sheet)
CREATE TABLE availability (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    date DATE NOT NULL,
    booked BOOLEAN NOT NULL,
    checked_at TIMESTAMP NOT NULL,
    UNIQUE(property_id, date)
);

-- Index for fast lookups
CREATE INDEX idx_availability_property_date ON availability(property_id, date);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Public read access (for dashboard via publishable key)
CREATE POLICY "Public read access" ON properties FOR SELECT USING (true);
CREATE POLICY "Public read access" ON availability FOR SELECT USING (true);

-- Service write access (for scraper via secret key)
CREATE POLICY "Service write access" ON properties FOR ALL USING (true);
CREATE POLICY "Service write access" ON availability FOR ALL USING (true);
