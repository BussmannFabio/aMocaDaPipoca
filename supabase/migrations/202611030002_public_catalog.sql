DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pipoca_public') THEN CREATE ROLE pipoca_public NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;
GRANT USAGE ON SCHEMA public TO pipoca_public;
GRANT SELECT ON store_settings,products,business_dates,date_offers,pickup_slots TO pipoca_public;
CREATE POLICY public_settings ON store_settings FOR SELECT TO pipoca_public USING(true);
CREATE POLICY public_products ON products FOR SELECT TO pipoca_public USING(active);
CREATE POLICY public_dates ON business_dates FOR SELECT TO pipoca_public USING(true);
CREATE POLICY public_offers ON date_offers FOR SELECT TO pipoca_public USING(enabled);
CREATE POLICY public_slots ON pickup_slots FOR SELECT TO pipoca_public USING(enabled);
