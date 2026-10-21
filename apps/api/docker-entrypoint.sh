#!/bin/sh
set -e
# Migraciones versionadas y controladas: solo aplica las pendientes, nunca resetea datos.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Aplicando migraciones…"
  npx prisma migrate deploy
fi
exec "$@"
