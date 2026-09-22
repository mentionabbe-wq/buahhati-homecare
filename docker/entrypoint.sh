#!/bin/sh
# Entrypoint container BuahHati Home Care.
# 1. memastikan konfigurasi wajib terisi
# 2. menunggu database siap lalu menyelaraskan skema
# 3. mengisi data awal hanya bila database masih kosong
# 4. menjalankan server Next.js
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "✗ DATABASE_URL belum diset." >&2
  exit 1
fi

if [ -z "$AUTH_SECRET" ] || [ ${#AUTH_SECRET} -lt 32 ]; then
  echo "✗ AUTH_SECRET belum diset atau kurang dari 32 karakter." >&2
  echo "  Buat dengan: openssl rand -hex 32" >&2
  exit 1
fi

echo "› Menyiapkan skema database…"
attempt=0
until npx prisma db push --skip-generate >/tmp/prisma-push.log 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "✗ Gagal menyiapkan skema setelah 30 percobaan:" >&2
    cat /tmp/prisma-push.log >&2
    exit 1
  fi
  echo "  database belum siap, mencoba lagi ($attempt/30)…"
  sleep 2
done
echo "✓ Skema database siap."

node docker/seed-if-empty.mjs

# Selalu mengikat ke 0.0.0.0. Variabel HOSTNAME tidak dipakai karena Docker
# mengisinya dengan nama host container, dan mengikat ke alamat itu membuat
# healthcheck lewat 127.0.0.1 gagal.
echo "› Menjalankan aplikasi pada 0.0.0.0:${PORT:-3000}…"
exec npx next start --port "${PORT:-3000}" --hostname 0.0.0.0
