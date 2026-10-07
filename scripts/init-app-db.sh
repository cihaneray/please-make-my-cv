#!/bin/sh
set -eu
export PGPASSWORD="$POSTGRES_PASSWORD"
psql -h db -U postgres -d cv_workspace -v ON_ERROR_STOP=1 -v app_password="$CV_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE cv_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cv_app') \gexec
SELECT format('ALTER ROLE cv_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'app_password') \gexec
ALTER DATABASE cv_workspace OWNER TO cv_app;
ALTER SCHEMA public OWNER TO cv_app;
SELECT format('ALTER TABLE %I.%I OWNER TO cv_app', schemaname, tablename)
FROM pg_tables WHERE schemaname = 'public' \gexec
SELECT format('ALTER SEQUENCE %I.%I OWNER TO cv_app', sequence_schema, sequence_name)
FROM information_schema.sequences WHERE sequence_schema = 'public' \gexec
SQL
