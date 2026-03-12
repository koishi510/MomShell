#!/bin/sh
set -e

PG_USER="${POSTGRES_USER:-momshell}"
PG_PASS="${POSTGRES_PASSWORD:-momshell}"
PG_DB="${POSTGRES_DB:-momshell}"

# Only start embedded PostgreSQL if DATABASE_URL is not set
# (docker-compose provides an external postgres container)
if [ -z "$DATABASE_URL" ]; then
  PG_DATA="/var/lib/postgresql/data"

  # Initialize PostgreSQL if needed
  if [ ! -s "$PG_DATA/PG_VERSION" ]; then
    mkdir -p "$PG_DATA"
    chown postgres:postgres "$PG_DATA"
    su postgres -c "initdb -D $PG_DATA --no-locale --encoding=UTF8"
    # Allow local connections without password + md5 for TCP
    echo "local all all trust" > "$PG_DATA/pg_hba.conf"
    echo "host all all 127.0.0.1/32 md5" >> "$PG_DATA/pg_hba.conf"
    echo "host all all ::1/128 md5" >> "$PG_DATA/pg_hba.conf"
  fi

  # Ensure log file is writable
  touch /var/log/postgresql.log
  chown postgres:postgres /var/log/postgresql.log

  # Start PostgreSQL
  su postgres -c "pg_ctl -D $PG_DATA -l /var/log/postgresql.log start -w"

  # Create user and database if they don't exist
  su postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='$PG_USER'\" | grep -q 1 || psql -c \"CREATE USER $PG_USER WITH PASSWORD '$PG_PASS'\""
  su postgres -c "psql -tc \"SELECT 1 FROM pg_catalog.pg_database WHERE datname='$PG_DB'\" | grep -q 1 || psql -c \"CREATE DATABASE $PG_DB OWNER $PG_USER\""

  export DATABASE_URL="postgres://$PG_USER:$PG_PASS@localhost:5432/$PG_DB?sslmode=disable"
fi

# Start backend in background
/app/server &

# Start nginx in foreground
exec nginx -g "daemon off;"
