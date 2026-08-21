# Roadmap — Batara Tertib

**Terakhir diubah:** 2026-08-21

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

Kulit: header fascia + konten `max-w-md` + kartu struk krem + aksi di bawah data + nav bawah 5 item (Petugas, SPBU, Plat, Riwayat, Laporan).

- [x] Login admin → panel kelola (bukan ISI/TOLAK)
- [x] Kelola SPBU (nama, aktif/nonaktif, tambah)
- [x] Kelola user: Edge Function `admin-users` deploy 2026-08-21; tambah/edit/sandi/nonaktif/hapus jalan dari panel
- [x] Lihat semua kendaraan; edit plat; hapus (hanya jika belum ada riwayat)
- [x] Lihat riwayat pengisian semua SPBU (filter tanggal + SPBU + plat); edit dan hapus
- [x] Laporan total liter BBM per jenis per SPBU (filter rentang tanggal, satu/semua SPBU, Pertalite/Pertamax/keduanya)
- [ ] Sembunyikan aduan melanggar — ditunda V2

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
- [ ] Halaman per SPBU (SEO)
- [ ] Cek plat 7 hari
- [ ] Cari aduan
- [ ] Sembunyikan aduan melanggar (admin)

## V3 — PWA + stok

- [ ] PWA install petugas
- [ ] Stok/antrian (opsional)

## Bukan V1

ANPR, MyPertamina, Samsat, native store, keuangan, CMS, peta GIS, kuota liter per jenis.

---

## Catatan

V1 inti selesai (`525adbc` di `origin/master`). Hosting ditunda sampai fitur dirasa pas. Slice V2 aduan + WebP dikerjakan tanpa menu baru di luar yang sudah di ROADMAP.
