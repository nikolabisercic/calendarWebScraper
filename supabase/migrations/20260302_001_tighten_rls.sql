-- Drop the overly permissive write policies
DROP POLICY "Service write access" ON properties;
DROP POLICY "Service write access" ON availability;

-- Restrict write access to the service_role only (secret key)
CREATE POLICY "Service role write access" ON properties
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role write access" ON availability
    FOR ALL TO service_role USING (true) WITH CHECK (true);
