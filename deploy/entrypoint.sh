#!/bin/sh
set -e

# Start backend in background
/app/server &

# Start nginx in foreground
exec nginx -g "daemon off;"
