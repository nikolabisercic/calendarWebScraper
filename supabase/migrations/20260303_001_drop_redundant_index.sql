-- The UNIQUE(property_id, date) constraint already creates an index.
-- This explicit index is redundant.
DROP INDEX IF EXISTS idx_availability_property_date;
