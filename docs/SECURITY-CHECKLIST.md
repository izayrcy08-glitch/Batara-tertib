# Security Checklist — Batara Tertib

Centang sebelum rilis tiap fase.

- [ ] Validasi input di server (Zod), bukan hanya client
- [ ] Query parameterized / Supabase client — no SQL string concat
- [ ] Auth middleware + cek ownership (user hanya akses SPBU sendiri)
- [ ] Secret di `.env`, tidak di git
- [ ] Error ke client generik; detail hanya di log server
- [ ] Upload foto: tipe, ukuran, nama sanitized
- [ ] Pagination untuk list API
- [ ] Rate limit endpoint sensitif (login, aduan)
- [ ] Captcha di form aduan warga
- [ ] Batas kirim aduan per IP
- [ ] Kode lacak aduan acak (tidak sequential)
- [ ] `noindex` di `/pom` dan `/admin`
- [ ] RLS Supabase: petugas hanya baca/tulis data SPBU sendiri
