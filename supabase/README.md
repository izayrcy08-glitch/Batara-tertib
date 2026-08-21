# Supabase — Batara Tertib

Project cloud: `https://vcktcdofiyvdsexpvtjj.supabase.co` (tanpa Docker).

## Migrasi

Jalankan berurutan di **Dashboard > SQL Editor**:

1. `supabase/migrations/20260818_v1_init.sql` — sudah
2. `supabase/migrations/20260818_v1_admin.sql` — sudah (Dashboard 2026-08-18: `Success. No rows returned` = DDL, bukan SELECT kosong)
3. `supabase/migrations/20260821_fix_rekap_bbm_cast.sql` — sudah (2026-08-21; cast `produk_bbm` di filter RPC)

Pesan `Success. No rows returned` normal: script hanya `ALTER`/`CREATE`, tidak ada `SELECT`.

## Edge Function `admin-users`

Kelola petugas (tambah / edit / nonaktif / hapus / reset sandi). Service role hanya di sini, bukan di frontend.

**Status:** deployed ke `vcktcdofiyvdsexpvtjj` (2026-08-21).

```sh
npx supabase login
npx supabase link --project-ref vcktcdofiyvdsexpvtjj
npx supabase functions deploy admin-users --use-api
```

## Seed user uji

Butuh `SUPABASE_SERVICE_ROLE_KEY` di `.env` (jangan di-commit):

```sh
node supabase/seed-users.mjs
```

Sandi default: `Batara123!`

## Tabel inti V1

| Tabel | Fungsi |
|-------|--------|
| `spbu` | Nama, aktif |
| `profiles` | Admin/petugas, `spbu_id`, `email`, `aktif` |
| `kendaraan` | `plat_lengkap` unik, `angka_plat`, `foto_url` opsional |
| `transaksi` | Liter, produk, waktu, SPBU, user |
| `tolakan` | Alasan, waktu, SPBU, user |

RPC `rekap_bbm` — total liter Pertalite/Pertamax per SPBU (boleh dipanggil anon; tanpa plat).
