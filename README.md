# BuahHati Home Care

Aplikasi web/PWA untuk layanan **home care pijat bayi & baby spa**. Terdiri dari landing page publik, formulir reservasi multi-step, portal pelanggan, portal terapis, dan dashboard admin lengkap.

Nama bisnis, logo, jam operasional, slot booking, harga, biaya home care, dan pengaturan lain dapat diubah dari menu **Pengaturan** tanpa menyentuh kode.

> **Status datasource saat ini: SQLite (mode demo).** Repo dikirim dalam keadaan siap jalan tanpa perlu memasang server database. Untuk beralih ke PostgreSQL — target produksi aplikasi ini — jalankan `npm run db:use:postgres`, sesuaikan `DATABASE_URL`, lalu `npm run db:migrate`. Schema-nya identik untuk kedua provider.

---

## 1. Teknologi

| Bagian | Teknologi |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Bahasa | TypeScript (strict) |
| Styling | Tailwind CSS v4 + komponen bergaya shadcn/ui di atas Radix UI |
| Database | PostgreSQL (produksi) · SQLite (mode demo offline) |
| ORM | Prisma 6 |
| Auth | Sesi JWT (jose) + bcryptjs, role-based, sesi dapat dicabut |
| Grafik | Recharts |
| Notifikasi | Modul WhatsApp dengan provider yang dapat dikonfigurasi (mock/Fonnte/Wablas/Meta) |
| Pembayaran | Modul dengan abstraksi payment provider (mock siap dikembangkan) |
| PWA | manifest + service worker + ikon (dibuat oleh skrip, tanpa dependensi image) |

---

## 2. Struktur Folder

```
buahhati-homecare/
├─ prisma/
│  ├─ schema.prisma          # 15 model, portable Postgres/SQLite
│  └─ seed.ts                # akun demo, master data, 20+ reservasi contoh
├─ scripts/
│  ├─ setup.mjs              # setup sekali jalan (.env → push → seed → ikon)
│  ├─ switch-db.mjs          # tukar datasource postgresql ⇄ sqlite
│  ├─ generate-icons.mjs     # buat ikon PWA 192/512 px
│  └─ reminder-worker.mjs    # worker cron pengingat H-1 & H-2 jam
├─ public/
│  ├─ manifest.webmanifest
│  ├─ sw.js                  # network-first; respons /api/* tidak pernah di-cache
│  └─ icons/
└─ src/
   ├─ app/
   │  ├─ page.tsx                    # landing page
   │  ├─ reservasi/                  # formulir reservasi 8 langkah (publik)
   │  ├─ cek-reservasi/              # cek status tanpa akun (kode + nomor WA)
   │  ├─ login/ · daftar/ · offline/
   │  ├─ akun/                       # portal CUSTOMER (bottom navigation)
   │  ├─ terapis/                    # portal TERAPIS
   │  ├─ admin/                      # dashboard ADMIN (sidebar)
   │  └─ api/                        # REST API
   ├─ components/                    # komponen lintas fitur + /ui (design system)
   ├─ features/                      # UI per domain: landing, reservation, admin, customer, therapist
   ├─ lib/                           # prisma, auth, rbac, api, validation, rate-limit, audit, datetime, utils
   ├─ services/                      # business logic murni (tanpa UI)
   │  ├─ availability.service.ts     # slot, ketersediaan terapis, anti double-booking
   │  ├─ reservation.service.ts      # pembuatan reservasi, state machine status, reschedule
   │  ├─ payment.service.ts · promo.service.ts · report.service.ts
   │  ├─ dashboard.service.ts · reminder.service.ts · settings.service.ts
   │  ├─ xlsx.ts                     # penulis XLSX minimal (tanpa dependensi)
   │  └─ whatsapp/                   # provider + template pesan
   └─ proxy.ts                       # penjaga rute berbasis peran (Next.js proxy/middleware)
```

Business logic dipisahkan dari UI: seluruh aturan reservasi ada di `src/services/*`, komponen halaman hanya memanggilnya.

---

## 3. Database Schema

15 model Prisma: `User`, `Session`, `Customer`, `Baby`, `Therapist`, `TherapistSchedule`, `TherapistTimeOff`, `Service`, `Reservation`, `ReservationStatusHistory`, `Treatment`, `Payment`, `Promo`, `Notification`, `AuditLog`, `Setting`.

Relasi utama:

```
User 1─1 Customer 1─n Baby
User 1─1 Therapist 1─n TherapistSchedule / TherapistTimeOff
Reservation n─1 Customer, Baby, Service, Therapist?, Promo?
Reservation 1─1 Treatment · 1─n Payment · 1─n ReservationStatusHistory · 1─n Notification
```

`Reservation` memuat `reservationCode`, `customerId`, `babyId`, `serviceId`, `therapistId`, `date`, `startTime`, `endTime`, `startAt`, `endAt`, alamat lengkap, `servicePrice`, `transportFee`, `discount`, `total`, `status`, `paymentStatus`, `customerNote`, `adminNote`, stempel waktu tiap perpindahan status, `createdAt`, `updatedAt`.

Catatan desain:

- Nilai enum (role, status, metode bayar) disimpan sebagai `String` dan divalidasi di `src/lib/constants.ts` + Zod. Ini membuat satu schema berjalan di PostgreSQL maupun SQLite tanpa perubahan model.
- `@@unique([therapistId, startAt])` mencegah satu terapis dipesan dua kali pada jam yang sama di level database.
- Uang disimpan sebagai `Int` (rupiah penuh) agar bebas galat pembulatan.

---

## 4. Environment Variables

Salin `.env.example` menjadi `.env`, lalu isi:

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | ya | Koneksi PostgreSQL, atau `file:./dev.db` untuk mode demo |
| `AUTH_SECRET` | ya | Kunci penandatangan sesi, minimal 32 karakter acak |
| `SESSION_MAX_AGE_DAYS` | tidak | Umur sesi, default 7 |
| `NEXT_PUBLIC_APP_NAME` | tidak | Nama aplikasi default sebelum diubah dari Pengaturan |
| `NEXT_PUBLIC_APP_URL` | tidak | Dipakai worker reminder |
| `BUSINESS_TZ_OFFSET` | tidak | Offset menit zona bisnis, default 420 (WIB) |
| `WHATSAPP_PROVIDER` | tidak | `mock` (default), `fonnte`, `wablas`, atau `meta` |
| `WHATSAPP_API_URL` / `WHATSAPP_API_KEY` / `WHATSAPP_SENDER` | tidak | Kredensial provider; kosongkan bila memakai mock |
| `PAYMENT_PROVIDER` dan kunci terkait | tidak | Modul gateway, default `mock` |
| `CRON_SECRET` | ya untuk reminder | Token bearer endpoint cron |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | tidak | Akun admin yang dibuat seed |

Tidak ada API key yang di-hardcode. Nilai rahasia tidak pernah masuk ke database maupun audit log.

---

## 5. Instalasi

```bash
npm install
```

## 6. Migrasi Database

Untuk PostgreSQL (mode default):

```bash
npm run db:migrate        # membuat migrasi pertama saat pengembangan
npm run db:migrate:deploy # menerapkan migrasi di server produksi
```

Untuk demo cepat tanpa server PostgreSQL, seluruh aplikasi bisa berjalan di atas SQLite:

```bash
npm run db:use:sqlite     # mengubah provider + DATABASE_URL, mengacak AUTH_SECRET
npm run db:push
```

Kembali ke PostgreSQL dengan `npm run db:use:postgres` lalu sesuaikan `DATABASE_URL`.

## 7. Seed Database

```bash
npm run db:seed
```

Alternatif satu perintah untuk semuanya (buat `.env`, acak secret, push schema, seed, buat ikon):

```bash
npm run setup            # memakai DATABASE_URL yang ada
npm run setup -- sqlite  # paksa mode demo SQLite
```

## 8. Menjalankan Development

```bash
npm run dev              # http://localhost:3000
```

## 9. Build Produksi

```bash
npm run build
npm start
```

## 10. Deploy

**Vercel / Netlify.** Set semua environment variable pada dashboard, arahkan `DATABASE_URL` ke PostgreSQL terkelola (Neon, Supabase, RDS). Perintah build `npm run build` sudah memanggil `prisma generate`. Jalankan `npx prisma migrate deploy` sebagai release command. Untuk pengingat otomatis, daftarkan Vercel Cron ke `POST /api/cron/reminders` dengan header `Authorization: Bearer $CRON_SECRET`.

**VPS / Docker.** Jalankan `npm ci && npm run build && npm start` di belakang reverse proxy (Nginx/Caddy) dengan HTTPS. HTTPS wajib: cookie sesi memakai flag `Secure` di produksi. Pengingat dapat dijalankan lewat `npm run cron:reminders` (worker bawaan) atau cron sistem:

```
*/15 * * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://domain-anda/api/cron/reminders
```

Rate limiter bawaan bersifat in-memory (cocok untuk satu instance). Untuk multi-instance, ganti implementasi `src/lib/rate-limit.ts` dengan Redis — antarmuka fungsinya tetap sama.

### Deploy di CasaOS

Repo menyertakan `Dockerfile`, `docker-compose.yml` (lengkap dengan metadata `x-casaos`), dan workflow GitHub Actions yang menerbitkan image ke `ghcr.io/mentionabbe-wq/buahhati-homecare`. Compose menjalankan dua container: aplikasi dan PostgreSQL 16.

> **Sekali saja setelah build pertama:** paket GHCR lahir dalam status privat, sehingga CasaOS menolak dengan pesan `error from registry: denied`. Buka https://github.com/users/mentionabbe-wq/packages/container/buahhati-homecare/settings → **Change visibility → Public**. Setelah itu image dapat ditarik tanpa login.

**Cara 1 — lewat antarmuka CasaOS.**

1. Buka **App Store → Custom Install → Import**, tempel isi `docker-compose.yml`.
2. Ganti tiga nilai wajib sebelum menekan Install:
   - `AUTH_SECRET` → hasil `openssl rand -hex 32`
   - `CRON_SECRET` → hasil `openssl rand -hex 24`
   - `POSTGRES_PASSWORD` dan bagian password pada `DATABASE_URL` (harus sama)
3. Install, lalu buka `http://<ip-casaos>:3600`.

**Cara 2 — lewat terminal CasaOS.**

```bash
git clone https://github.com/mentionabbe-wq/buahhati-homecare.git
cd buahhati-homecare
cp .env.docker.example .env      # isi AUTH_SECRET, CRON_SECRET, POSTGRES_PASSWORD
docker compose -f docker-compose.build.yml up -d --build
```

Saat container pertama kali hidup, entrypoint menunggu PostgreSQL siap, menyelaraskan skema dengan `prisma db push`, lalu mengisi data awal **hanya bila tabel pengguna masih kosong** — restart berikutnya tidak akan menimpa data sungguhan. Setel `SEED_DATABASE=false` bila tidak ingin akun demo dibuat sama sekali.

Data PostgreSQL disimpan di `/DATA/AppData/buahhati-homecare/postgres` (Cara 1) atau pada named volume `buahhati-db-data` (Cara 2). Cadangkan folder/volume tersebut untuk backup.

Pengingat otomatis di CasaOS dijalankan lewat cron host:

```
*/15 * * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3600/api/cron/reminders
```

## 11. Akun Demo

| Peran | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `Admin123!` |
| Terapis | `siti@example.com` (juga `rina@`, `dewi@`) | `Terapis123!` |
| Customer | `customer@example.com` | `Customer123!` |

Kredensial ini hanya untuk demo dan ditampilkan di halaman login **hanya saat `NODE_ENV` bukan production**. Ganti sebelum dipakai sungguhan.

---

## 12. API Singkat

Semua respons berbentuk `{ success: boolean, data?: … , message?: string, errors?: Record<string,string> }`. Permintaan mutasi memeriksa kesamaan Origin (proteksi CSRF) dan sesi cookie `httpOnly`.

| Method | Endpoint | Akses | Keterangan |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | publik | Login, rate limit 8/5 menit per IP |
| POST | `/api/auth/register` | publik | Daftar akun pelanggan |
| POST | `/api/auth/logout` | terautentikasi | Mencabut sesi |
| GET | `/api/services` | publik | Daftar layanan aktif (`?all=1` untuk admin) |
| POST · PATCH · DELETE | `/api/services[/:id]` | admin | CRUD layanan; layanan terpakai dinonaktifkan, bukan dihapus |
| GET | `/api/therapists` | publik | Tanpa parameter: terapis aktif. Dengan `date`, `startTime`, `serviceId`: hanya yang benar-benar tersedia |
| POST · PATCH · DELETE | `/api/therapists[/:id]` | admin | CRUD terapis + jadwal kerja + hari libur |
| GET | `/api/availability?date&serviceId[&therapistId]` | publik | Slot per jam beserta alasan bila tidak tersedia |
| POST | `/api/reservations` | publik | Membuat reservasi (transaksi, anti double-booking) |
| GET | `/api/reservations` | terautentikasi | Terfilter otomatis sesuai peran; mendukung `q`, `status`, `from`, `to`, `therapistId`, `serviceId`, `page` |
| GET · PATCH · DELETE | `/api/reservations/:id` | pemilik/terapis/admin | Detail, ubah status/jadwal, batalkan |
| POST | `/api/reservations/lookup` | publik | Cek status dengan kode + nomor WhatsApp |
| GET · POST | `/api/payments` | admin (GET pemilik) | Daftar & catat pembayaran |
| PATCH | `/api/payments/:id` | admin | Konfirmasi lunas / refund |
| POST | `/api/treatments` | terapis/admin | Simpan catatan treatment (audit trail) |
| GET · POST | `/api/promos[/:id]` | publik/admin | Promo aktif untuk publik, CRUD untuk admin |
| GET · PATCH | `/api/settings` | admin | Pengaturan aplikasi |
| GET · POST | `/api/notifications/whatsapp` | admin | Log & kirim ulang notifikasi |
| GET | `/api/reports/export?kind&from&to&format` | admin | Ekspor CSV atau XLSX |
| POST | `/api/cron/reminders` | bearer `CRON_SECRET` / admin | Menjalankan pengingat H-1 dan H-2 jam |

---

## 13. Aturan Bisnis yang Ditegakkan Sistem

Sebelum sebuah reservasi tersimpan, `assertSlotAvailable()` memeriksa di dalam satu transaksi database (isolasi `Serializable` di PostgreSQL):

1. Layanan masih aktif.
2. Jam termasuk daftar slot dan berada dalam jam operasional.
3. Tidak melewati batas minimal jam sebelum treatment dan batas maksimal hari ke depan.
4. Kuota layanan per slot belum penuh.
5. Terapis bertugas pada hari itu, tidak sedang libur, dan jamnya masuk jadwal kerja.
6. Tidak bentrok dengan reservasi lain (perbandingan rentang `startAt`/`endAt`).
7. Kuota kunjungan harian terapis belum habis.

Bila terapis tidak dipilih pelanggan, sistem menugaskan terapis bebas dengan beban kerja paling ringan hari itu. Perpindahan status mengikuti state machine `STATUS_TRANSITIONS`, sehingga status tidak dapat melompat sembarangan.

Kondisi bayi yang berpotensi kontraindikasi (demam, diare, sedang minum obat, dan lain-lain) menandai reservasi sebagai `needsReview` dan menampilkan peringatan agar dikonfirmasi admin/terapis lebih dulu. Aplikasi tidak memberikan diagnosis medis.

---

## 14. Keamanan & Privasi

- Password di-hash bcrypt (cost 12); tidak pernah disimpan atau dikirim dalam bentuk asli.
- Sesi disimpan sebagai JWT `httpOnly` + baris `Session` sehingga dapat dicabut kapan saja.
- Otorisasi berlapis: `proxy.ts` menjaga rute, `requirePageAuth`/`requireAuth` menjaga halaman dan API, `canReadReservation` menjaga tiap objek.
- Terapis hanya melihat reservasi dan data bayi yang ditugaskan kepadanya; pelanggan hanya melihat datanya sendiri.
- Validasi masukan dengan Zod di setiap endpoint; query lewat Prisma (parameterisasi, aman dari SQL injection).
- Proteksi CSRF melalui pemeriksaan Origin pada semua metode mutasi, cookie `SameSite=Lax`.
- Rate limiting pada login, registrasi, pembuatan reservasi, dan pencarian reservasi.
- Header keamanan: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Audit log mencatat aktor, aksi, entitas, serta nilai sebelum/sesudah; field bernuansa rahasia otomatis diredaksi.
- Service worker tidak pernah menyimpan respons `/api/*`, sehingga data pelanggan dan bayi tidak tertinggal di cache perangkat.

---

## 15. Catatan Teknis

- **Zona waktu.** Semua jadwal diperlakukan sebagai wall clock zona bisnis lalu dipetakan ke UTC (`src/lib/datetime.ts`), sehingga slot konsisten walau server memakai zona berbeda.
- **Urutan langkah reservasi.** Pemilihan jadwal ditempatkan sebelum pemilihan terapis, karena daftar terapis harus difilter berdasarkan tanggal dan jam yang dipilih.
- **Ekspor PDF** memakai dialog cetak browser dari halaman yang sudah bergaya cetak (invoice dan laporan), sehingga tidak menambah dependensi rendering PDF.
- **Ekspor Excel** memakai penulis XLSX minimal buatan sendiri (`src/services/xlsx.ts`) agar tidak bergantung pada pustaka spreadsheet yang punya riwayat kerentanan.
- `npm audit` melaporkan isu pada `deepmerge-ts`, dependensi transitif dari CLI Prisma. Paket ini hanya dipakai saat menjalankan perintah CLI, bukan di jalur runtime aplikasi.
