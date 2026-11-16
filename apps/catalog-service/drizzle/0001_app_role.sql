-- The role catalog-service runs as (FR-043, research R-15): it reads, adds and changes
-- catalog rows, nothing else. No DELETE (deletion is soft), no TRUNCATE, no DDL.
-- Created NOLOGIN here: its password is set by the db:migrate step, never committed.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'catalog_app') THEN
    CREATE ROLE catalog_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
      NOBYPASSRLS CONNECTION LIMIT 20;
  END IF;
END
$$;
--> statement-breakpoint
ALTER ROLE catalog_app SET statement_timeout = '5s';
--> statement-breakpoint
ALTER ROLE catalog_app SET search_path = public;
--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO catalog_app', current_database());
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO catalog_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO catalog_app;
--> statement-breakpoint
-- Tables later migrations create (they run as the same owner) get the same rights.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO catalog_app;
