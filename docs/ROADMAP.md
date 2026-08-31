# Roadmap — Batara Tertib

**Terakhir diubah:** 2026-08-31

---

## V0 — Setup (selesai 2026-08-18)

- [x] AGENTS.md, DESIGN.md, ROADMAP.md
- [x] `.cursor/rules/` (konstitusi, anti-slop, UX pompa)
- [x] `packages/tokens` — palet + font (Barlow Condensed, Source Sans 3)
- [x] `packages/ui` — shadcn base-nova, komponen inti
- [x] `apps/pom` — kulit island malam, input plat dummy, ISI/TOLAK disabled
- [x] `apps/warga` — kulit beranda siang, 5 SPBU static
- [x] `supabase/README.md` — data inti + .env.example
- [x] Build sukses + Playwright smoke 390/1024 lulus

---

## V1 — `/pom` petugas

- [x] Login petugas (Supabase Auth, 1 user : 1 SPBU)
- [x] Cari plat (angka atau lengkap); kartu hasil tampil nama SPBU yang mencatat isi/tolak terakhir
- [x] Daftar cepat: tombol **Daftar baru** selalu di bawah kotak cari (bukan menu navbar); plat lengkap satu kolom + matching STNK + foto opsional; form juga muncul otomatis jika plat tidak ketemu
- [x] Riwayat pengisian 7 hari (termasuk pompa lain)
- [x] Tolak isi ulang hari yang sama (1 plat = 1 isi sukses/hari WIB, semua pompa)
- [x] Catat liter + produk BBM
- [x] Hak jawab aduan di pompa sendiri — slice V2 (satu balasan)

## V1 — `/admin`

Login admin di URL `/pom` yang sama; role `admin` membuka panel kelola (bukan ISI/TOLAK). Bukan app terpisah.

Kulit: header fascia + konten `max-w-md` + kartu struk krem + aksi di bawah data + nav bawah 6 item (Petugas, SPBU, Plat, Riwayat, Laporan, Aduan).

- [x] Login admin → panel kelola (bukan ISI/TOLAK)
- [x] Kelola SPBU (nama, aktif/nonaktif, tambah)
- [x] Kelola user: Edge Function `admin-users` deploy 2026-08-21; tambah/edit/sandi/nonaktif/hapus jalan dari panel
- [x] Lihat semua kendaraan; edit plat; hapus (hanya jika belum ada riwayat)
- [x] Lihat riwayat pengisian semua SPBU (filter tanggal + SPBU + plat); edit dan hapus
- [x] Laporan total liter BBM per jenis per SPBU (filter rentang tanggal, satu/semua SPBU, Pertalite/Pertamax/keduanya)
- [x] Sembunyikan aduan melanggar — tab Aduan (admin)

SQL `supabase/migrations/20260818_v1_admin.sql` dijalankan di Dashboard 2026-08-18 (`Success. No rows returned` = DDL OK). Isi: `profiles.email`/`aktif`, RLS, max 2 petugas, RPC `rekap_bbm`.

Fix cast enum: `supabase/migrations/20260821_fix_rekap_bbm_cast.sql` diterapkan 2026-08-21 (error `produk_bbm = text` → RPC 200).

## V1 — situs warga

- [x] Halaman publik **Cek Pengeluaran BBM dari SPBU** (`/laporan`): filter tanggal, SPBU, Pertalite/Pertamax; tanpa plat dan tanpa nama petugas. Kosong = "Belum ada pengisian di rentang ini"; gagal = "Tidak bisa memuat. Coba lagi."

## V2 — Situs warga

### Slice aktif (2026-08-21)

- [x] Foto WebP: sumber max 5 MB → WebP sisi panjang max 1280 px, quality 0.72, hard cap hasil 400 KB (kendaraan + aduan)
- [x] Aduan anonim: SPBU, judul, isi, foto opsional, kode lacak (tampil setelah kirim)
- [x] Jawab SPBU di pompa (satu balasan, bukan utas panjang)
- [x] Purge H+7 setelah ditanggapi: hapus baris aduan + objek Storage (foto kendaraan tetap)
- [x] Halaman per SPBU (SEO)
- [x] Cek plat 7 hari
- [x] Cari aduan
- [x] Sembunyikan aduan melanggar (admin)
- [x] Beranda warga: ganti daftar SPBU berulang → feed aduan publik 7 hari + hak jawab SPBU (bukan komentar warga)

## V3 — PWA + stok

- [x] PWA install petugas
- [x] Stok (opsional)

### Stok (slice 2026-08-28, antrian dihapus 2026-08-31)

Petugas update manual di pompa sendiri; warga lihat live (bukan cache build).

| Field | Nilai | Siapa ubah |
|-------|--------|------------|
| Stok Pertalite | Ada / Kosong | Petugas SPBU |
| Stok Pertamax | Ada / Kosong | Petugas SPBU |

- **Petugas `/pom`:** strip kompak di bawah header (bukan menu navbar baru).
- **Warga:** panel stok di halaman `/spbu/[slug]` + papan kompak di beranda.
- **DB:** kolom stok di `spbu` + RPC `set_kondisi_spbu` (petugas → SPBU sendiri).
- Bukan: antrian manual, stok liter persis, produk selain Pertalite/Pertamax.

## Bukan V1

ANPR, MyPertamina, Samsat, native store, keuangan, CMS, peta GIS, kuota liter per jenis.

---

## Catatan

V1 inti selesai (`525adbc` di `origin/master`). Slice V2 warga selesai: WebP, aduan, purge H+7, cek plat, halaman SPBU SEO, cari aduan, sembunyikan aduan (admin). V3 slice PWA install petugas: banner pasang di login `/pom`, manifest + ikon relatif ke `/pom/`. V3 stok: petugas ubah manual di pompa, warga lihat stok live di halaman SPBU (migration `20260828_v3_stok_antrian.sql`; antrian dihapus `20260831_drop_antrian.sql`).

**Hosting (2026-08-21):** Cloudflare Workers + static assets. Deploy Git: `npm run build` → `npx wrangler deploy`. Subdomain akun diganti `izayrcy08` → `bataratertib`. Production: `https://batara-tertib.bataratertib.workers.dev` (+ `/pom/`).

**Infra aduan (2026-08-23):** Edge Function `purge-aduan` deployed; cron `purge-aduan-daily` (~00:15 WIB) via pg_cron + Vault `service_role_key`.

**SQL V2 warga (2026-08-23):** `cek_plat_rpc` + `aduan_cari_sembunyi` diterapkan di Dashboard.

**SQL V3 stok (2026-08-28):** `20260828_v3_stok_antrian.sql` diterapkan di Dashboard.

**Hapus antrian (2026-08-31):** fitur antrian (Sepi/Sedang/Ramai) dihapus dari UI; RPC `set_kondisi_spbu` tanpa parameter antrian — jalankan `supabase/migrations/20260831_drop_antrian.sql` di Dashboard.

**Koreksi SPBU (2026-08-31):** LANJAS → `SPBU KM 02 JL BRIGJEN KATAMSO` — jalankan `supabase/migrations/20260831_fix_spbu_katamso.sql` di Dashboard.

**Beranda feed aduan (2026-08-30):** Section daftar SPBU di beranda diganti feed aduan publik 7 hari + hak jawab SPBU (bukan komentar warga). RPC `daftar_aduan_publik` — jalankan `supabase/migrations/20260830_daftar_aduan_publik.sql` di Dashboard. Stok tetap di halaman `/spbu/[slug]`.
