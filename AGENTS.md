# AGENTS.md — Batara Tertib

Sebelum ubah kode, baca dulu:
1. `.cursor/rules/` — konstitusi, anti-slop, UX pompa
2. `docs/DESIGN.md` — palet, huruf, dua kulit
3. `docs/ROADMAP.md` — fase mana yang sedang dikerjakan

## Stack

- **Warga:** Astro static + Tailwind + React island
- **Petugas:** Vite React TS PWA di `/pom`
- **Komponen:** shadcn/ui (`packages/ui`) — jangan buat Button/Input/Card sendiri
- **Token:** `packages/tokens` — jangan hardcode hex di file lain
- **Backend:** Supabase (Auth, Postgres, Storage)
- **Hosting:** Cloudflare Workers + static assets (gratis awal → custom domain + Supabase Pro nanti)

- **Bukan:** Next.js, Laravel, shared hosting PHP

## Aturan

- Fitur di luar `docs/ROADMAP.md` ditolak. Ubah ROADMAP dulu, baru kode.
- Simple mengalahkan lengkap. Kalau ragu, potong fitur.
- PowerShell: pakai `;` bukan `&&`.
- Harga/liter = integer di kode dan DB.
- Validasi Zod di server; toast sonner; foto opsional.
