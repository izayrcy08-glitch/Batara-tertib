# Supabase — Batara Tertib

Project cloud: `https://vcktcdofiyvdsexpvtjj.supabase.co` (tanpa Docker).

## Migrasi

Jalankan berurutan di **Dashboard > SQL Editor**:

1. `supabase/migrations/20260818_v1_init.sql` — sudah
2. `supabase/migrations/20260818_v1_admin.sql` — sudah (Dashboard 2026-08-18: `Success. No rows returned` = DDL, bukan SELECT kosong)
3. `supabase/migrations/20260821_fix_rekap_bbm_cast.sql` — sudah (2026-08-21; cast `produk_bbm` di filter RPC)
4. `supabase/migrations/20260821_v2_aduan.sql` — **jalankan** (tabel `aduan`, RPC `kirim_aduan`, bucket Storage `aduan`/`kendaraan` WebP)

Pesan `Success. No rows returned` normal: script hanya `ALTER`/`CREATE`, tidak ada `SELECT`.

## Foto (WebP)

- Sumber max 5 MB → kompres client ke WebP (sisi panjang max 1280 px, quality 0.72, hasil max 400 KB)
- Bucket `kendaraan` dan `aduan`: `allowed_mime_types = image/webp`, `file_size_limit` 512 KB
- Foto kendaraan: disimpan tetap. Foto/aduan: ikut baris aduan, dihapus H+7 setelah dijawab

## Edge Function `admin-users`

Kelola petugas (tambah / edit / nonaktif / hapus / reset sandi). Service role hanya di sini, bukan di frontend.

**Status:** deployed ke `vcktcdofiyvdsexpvtjj` (2026-08-21).

```sh
npx supabase login
npx supabase link --project-ref vcktcdofiyvdsexpvtjj
npx supabase functions deploy admin-users --use-api
```

## Edge Function `purge-aduan`

Hapus aduan yang sudah dijawab lebih dari 7 hari (+ objek Storage). Auth: `Authorization: Bearer <SERVICE_ROLE_KEY>`.

```sh
npx supabase functions deploy purge-aduan --use-api --project-ref vcktcdofiyvdsexpvtjj
```

### Jadwal harian (pg_cron + pg_net)

Di SQL Editor (setelah extension aktif di project):

```sql
-- Sesuaikan project-ref URL function
select cron.schedule(
  'purge-aduan-daily',
  '15 17 * * *', -- ~00:15 WIB (UTC+7)
  $$
  select net.http_post(
    url := 'https://vcktcdofiyvdsexpvtjj.supabase.co/functions/v1/purge-aduan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Alternatif tanpa Vault: panggil manual / Cron Dashboard dengan header Bearer service role (jangan commit key).

Uji sekali:

```sh
curl -X POST "https://vcktcdofiyvdsexpvtjj.supabase.co/functions/v1/purge-aduan" ^
  -H "Authorization: Bearer %SUPABASE_SERVICE_ROLE_KEY%"
```

## Seed user uji

Butuh `SUPABASE_SERVICE_ROLE_KEY` di `.env` (jangan di-commit):

```sh
node supabase/seed-users.mjs
```

Sandi default: `Batara123!`

## Tabel inti

| Tabel | Fungsi |
|-------|--------|
| `spbu` | Nama, aktif |
| `profiles` | Admin/petugas, `spbu_id`, `email`, `aktif` |
| `kendaraan` | `plat_lengkap` unik, `angka_plat`, `foto_url` opsional |
| `transaksi` | Liter, produk, waktu, SPBU, user |
| `tolakan` | Alasan, waktu, SPBU, user |
| `aduan` | Anonim, kode lacak, foto opsional, satu jawaban SPBU |

RPC `rekap_bbm` — total liter Pertalite/Pertamax per SPBU (boleh dipanggil anon; tanpa plat).

RPC `kirim_aduan` — insert aduan publik, kembalikan `kode_lacak`.
