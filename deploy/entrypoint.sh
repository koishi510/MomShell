#!/bin/sh
set -e

PG_USER="${POSTGRES_USER:-momshell}"
PG_PASS="${POSTGRES_PASSWORD:-momshell}"
PG_DB="${POSTGRES_DB:-momshell}"

# Start embedded PostgreSQL if DATABASE_URL is not set,
# or if it points to localhost but PostgreSQL is not running.
start_embedded_pg() {
  PG_DATA="/var/lib/postgresql/data"

  # Initialize PostgreSQL if needed
  if [ ! -s "$PG_DATA/PG_VERSION" ]; then
    echo "[entrypoint] Initializing PostgreSQL data directory..."
    mkdir -p "$PG_DATA"
    chown postgres:postgres "$PG_DATA"
    su -s /bin/sh postgres -c "initdb -D $PG_DATA --no-locale --encoding=UTF8"
    # Allow local connections without password + md5 for TCP
    su -s /bin/sh postgres -c "cat > $PG_DATA/pg_hba.conf << 'PGEOF'
local all all trust
host all all 127.0.0.1/32 md5
host all all ::1/128 md5
PGEOF"
  fi

  # Ensure log file is writable
  touch /var/log/postgresql.log
  chown postgres:postgres /var/log/postgresql.log

  # Start PostgreSQL
  echo "[entrypoint] Starting PostgreSQL..."
  su -s /bin/sh postgres -c "pg_ctl -D $PG_DATA -l /var/log/postgresql.log start -w -t 30"
  echo "[entrypoint] PostgreSQL started."

  # Wait until PostgreSQL is ready to accept connections
  for i in $(seq 1 15); do
    if su -s /bin/sh postgres -c "pg_isready -q"; then
      break
    fi
    echo "[entrypoint] Waiting for PostgreSQL to be ready... ($i/15)"
    sleep 1
  done

  # Create user and database if they don't exist
  echo "[entrypoint] Ensuring database '$PG_DB' and user '$PG_USER' exist..."
  su -s /bin/sh postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='$PG_USER'\" | grep -q 1 || psql -c \"CREATE USER $PG_USER WITH PASSWORD '$PG_PASS'\""
  su -s /bin/sh postgres -c "psql -tc \"SELECT 1 FROM pg_catalog.pg_database WHERE datname='$PG_DB'\" | grep -q 1 || psql -c \"CREATE DATABASE $PG_DB OWNER $PG_USER\""

  export DATABASE_URL="postgres://$PG_USER:$PG_PASS@localhost:5432/$PG_DB?sslmode=disable"
  echo "[entrypoint] Embedded PostgreSQL ready. DATABASE_URL set."
}

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] DATABASE_URL not set, starting embedded PostgreSQL..."
  start_embedded_pg
else
  # If DATABASE_URL points to localhost, check if PostgreSQL is reachable
  case "$DATABASE_URL" in
    *localhost*|*127.0.0.1*)
      if ! pg_isready -h 127.0.0.1 -p 5432 -q 2>/dev/null; then
        echo "[entrypoint] DATABASE_URL points to localhost but PostgreSQL is not running, starting embedded..."
        start_embedded_pg
      else
        echo "[entrypoint] Using existing local PostgreSQL."
      fi
      ;;
    *)
      echo "[entrypoint] Using external database."
      ;;
  esac
fi

# Start backend in background
echo "[entrypoint] Starting backend server..."
/app/server &

# Start nginx in foreground
echo "[entrypoint] Starting nginx..."
exec nginx -g "daemon off;"
