CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='pipoca_app') THEN CREATE ROLE pipoca_app NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;
CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL UNIQUE,
 phone text NOT NULL, password_hash text NOT NULL, role text NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE TABLE password_resets (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL, used_at timestamptz);
CREATE TABLE local_mailbox (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient text NOT NULL, subject text NOT NULL, reset_url text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE auth_attempts (key text PRIMARY KEY, attempts integer NOT NULL, window_start timestamptz NOT NULL DEFAULT now());
CREATE TABLE store_settings (id boolean PRIMARY KEY DEFAULT true CHECK(id), name text NOT NULL, whatsapp text NOT NULL DEFAULT '', pickup_address text NOT NULL, lead_days integer NOT NULL DEFAULT 15 CHECK(lead_days>=0), reservation_minutes integer NOT NULL DEFAULT 15 CHECK(reservation_minutes BETWEEN 5 AND 60));
CREATE TABLE products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text NOT NULL DEFAULT '', category text NOT NULL DEFAULT 'Pipocas gourmet',
 image text NOT NULL DEFAULT '/products/pipoca-caramelo.svg', unit text NOT NULL DEFAULT 'pacote de 100 g', price_cents integer NOT NULL CHECK(price_cents>0),
 min_qty integer NOT NULL DEFAULT 1 CHECK(min_qty>0), max_qty integer NOT NULL DEFAULT 50 CHECK(max_qty>=min_qty), lead_days integer NOT NULL DEFAULT 15 CHECK(lead_days>=0),
 active boolean NOT NULL DEFAULT true, options jsonb NOT NULL DEFAULT '{"flavors":[],"addons":[],"fields":[]}'::jsonb, version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE business_dates (date date PRIMARY KEY, is_open boolean NOT NULL DEFAULT false, note text NOT NULL DEFAULT '');
CREATE TABLE date_offers (
 date date NOT NULL REFERENCES business_dates(date), product_id uuid NOT NULL REFERENCES products(id), enabled boolean NOT NULL DEFAULT true,
 capacity integer NOT NULL CHECK(capacity>=0), reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0), confirmed integer NOT NULL DEFAULT 0 CHECK(confirmed>=0),
 PRIMARY KEY(date,product_id), CHECK(reserved+confirmed<=capacity)
);
CREATE TABLE pickup_slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), date date NOT NULL REFERENCES business_dates(date), label text NOT NULL,
 enabled boolean NOT NULL DEFAULT true, capacity integer NOT NULL DEFAULT 10 CHECK(capacity>=0), reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0), confirmed integer NOT NULL DEFAULT 0 CHECK(confirmed>=0),
 UNIQUE(date,label), CHECK(reserved+confirmed<=capacity)
);
CREATE TABLE lead_time_exceptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), date date NOT NULL REFERENCES business_dates(date), reason text NOT NULL, created_by uuid NOT NULL REFERENCES users(id), revoked boolean NOT NULL DEFAULT false, UNIQUE(user_id,date));
CREATE SEQUENCE order_numbers START 1001;
CREATE TABLE orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number bigint NOT NULL DEFAULT nextval('order_numbers') UNIQUE,
 user_id uuid NOT NULL REFERENCES users(id), date date NOT NULL REFERENCES business_dates(date), slot_id uuid NOT NULL REFERENCES pickup_slots(id),
 state text NOT NULL DEFAULT 'pending_payment' CHECK(state IN ('pending_payment','confirmed','in_production','ready','fulfilled','expired','cancelled')),
 total_cents integer NOT NULL CHECK(total_cents>0), snapshot jsonb NOT NULL,
 checkout_key text NOT NULL, payload_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,checkout_key)
);
CREATE TABLE order_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), product_id uuid NOT NULL REFERENCES products(id), quantity integer NOT NULL CHECK(quantity>0), snapshot jsonb NOT NULL);
CREATE TABLE reservations (order_id uuid PRIMARY KEY REFERENCES orders(id), state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','consumed','expired','released')), expires_at timestamptz NOT NULL);
CREATE TABLE payment_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), method text NOT NULL CHECK(method IN ('pix','card')), provider text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('created','pending','approved','rejected','expired','failed','refund_pending','refunded','refund_failed')),
 amount_cents integer NOT NULL CHECK(amount_cents>0), currency text NOT NULL DEFAULT 'BRL', idempotency_key text NOT NULL UNIQUE,
 provider_id text UNIQUE, checkout_url text, qr_code text, copy_paste text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_events (id text PRIMARY KEY, payment_id uuid NOT NULL REFERENCES payment_attempts(id), status text NOT NULL, processed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE financial_exceptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), payment_id uuid NOT NULL REFERENCES payment_attempts(id), reason text NOT NULL, status text NOT NULL DEFAULT 'open', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(payment_id,reason));
CREATE TABLE cancellation_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), user_id uuid NOT NULL REFERENCES users(id), reason text NOT NULL, status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','approved','denied')), decision_note text, decided_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX one_open_cancellation ON cancellation_requests(order_id) WHERE status='requested';
CREATE TABLE refund_operations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid NOT NULL UNIQUE REFERENCES payment_attempts(id), status text NOT NULL DEFAULT 'pending', provider_ref text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE order_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), actor_id uuid REFERENCES users(id), action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES users(id), action text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX orders_customer ON orders(user_id,created_at DESC);
CREATE INDEX orders_date ON orders(date,state);
CREATE INDEX reservation_expiry ON reservations(expires_at) WHERE state='active';
CREATE INDEX payments_pending ON payment_attempts(status,created_at);
CREATE FUNCTION app_user_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id',true),'')::uuid $$;
CREATE FUNCTION app_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$ SELECT EXISTS(SELECT 1 FROM public.users WHERE id=public.app_user_id() AND role='admin') $$;
REVOKE ALL ON FUNCTION app_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_is_admin() TO pipoca_app;
GRANT USAGE ON SCHEMA public TO pipoca_app;
GRANT SELECT ON users TO pipoca_app;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_visibility ON users FOR SELECT TO pipoca_app USING(id=app_user_id() OR app_is_admin());
GRANT UPDATE(name,phone) ON users TO pipoca_app;
CREATE POLICY user_profile_edit ON users FOR UPDATE TO pipoca_app USING(id=app_user_id()) WITH CHECK(id=app_user_id());
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['store_settings','products','business_dates','date_offers','pickup_slots'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON %I TO pipoca_app',t);
 EXECUTE format('CREATE POLICY read_authenticated ON %I FOR SELECT TO pipoca_app USING (app_user_id() IS NOT NULL)',t);
 EXECUTE format('CREATE POLICY admin_changes ON %I FOR ALL TO pipoca_app USING (app_is_admin()) WITH CHECK(app_is_admin())',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['orders','cancellation_requests'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('GRANT SELECT ON %I TO pipoca_app',t);
 EXECUTE format('CREATE POLICY owned_read ON %I FOR SELECT TO pipoca_app USING (user_id=app_user_id() OR app_is_admin())',t);
 END LOOP;
END $$;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['order_items','reservations','payment_attempts','order_history'] LOOP
 EXECUTE format('GRANT SELECT ON %I TO pipoca_app',t);
 EXECUTE format('CREATE POLICY owned_read ON %I FOR SELECT TO pipoca_app USING (EXISTS(SELECT 1 FROM orders o WHERE o.id=order_id))',t);
 END LOOP;
END $$;
ALTER TABLE lead_time_exceptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON lead_time_exceptions TO pipoca_app;
CREATE POLICY exception_read ON lead_time_exceptions FOR SELECT TO pipoca_app USING(user_id=app_user_id() OR app_is_admin());
ALTER TABLE financial_exceptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON financial_exceptions TO pipoca_app;
CREATE POLICY finance_admin ON financial_exceptions FOR SELECT TO pipoca_app USING(app_is_admin());
ALTER TABLE refund_operations ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON refund_operations TO pipoca_app;
CREATE POLICY refund_read ON refund_operations FOR SELECT TO pipoca_app USING(EXISTS(SELECT 1 FROM payment_attempts p WHERE p.id=payment_id));
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON audit_log TO pipoca_app;
CREATE POLICY audit_admin ON audit_log FOR SELECT TO pipoca_app USING(app_is_admin());
