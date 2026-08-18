# Roadmap — Batara Tertib

**Terakhir diubah:** 2026-08-18

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

- [ ] Login petugas (Supabase Auth, 1 user : 1 SPBU)
- [ ] Cari plat (angka atau lengkap)
- [ ] Daftar cepat: plat lengkap satu kolom + matching STNK + foto kendaraan opsional
- [ ] Riwayat pengisian 7 hari (termasuk pompa lain)
- [ ] Tolak isi ulang hari yang sama (1 plat = 1 isi sukses/hari WIB, semua pompa)
- [ ] Catat liter + produk BBM
- [ ] Hak jawab aduan di pompa sendiri

## V1 — `/admin`

- [ ] Login admin terpisah
- [ ] Kelola SPBU (nama, aktif/nonaktif, tambah)
- [ ] Kelola user (1 per pompa default; opsional user ke-2 jalan bersamaan)
- [ ] Sembunyikan aduan melanggar
- [ ] Reset sandi

## V2 — Situs warga

- [ ] Halaman per SPBU (SEO)
- [ ] Aduan anonim + foto opsional + kode lacak
- [ ] Hak jawab SPBU di utas
- [ ] Cek plat 7 hari
- [ ] Cari aduan

## V3 — PWA + stok

- [ ] PWA install petugas
- [ ] Stok/antrian (opsional)

## Bukan V1

ANPR, MyPertamina, Samsat, native store, keuangan, CMS, peta GIS, kuota liter per jenis.
