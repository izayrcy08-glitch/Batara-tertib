# Batara Tertib

Pengawasan distribusi BBM 5 SPBU di Kabupaten Barito Utara, Muara Teweh.

## Stack

- **Warga:** Astro static (SEO, HTML ringan)
- **Petugas:** Vite React PWA di `/pom`
- **Backend:** Supabase (Auth, Postgres, Storage)
- **Hosting:** Cloudflare Pages

## Cara menjalankan

```powershell
npm install

# Dev server warga (port 4321)
npm run dev:warga

# Dev server petugas (port 5173) — path lokal `/`, di production `/pom/`
npm run dev:pom
```

## Build lokal

```powershell
npm run build
```

## Cloudflare Pages

Ini harus **Pages** (URL `*.pages.dev`), bukan Workers (`*.workers.dev`).

| Setting | Nilai |
|---------|--------|
| Root directory | *(kosong — root monorepo)* |
| Build command | `npm run build` atau `npm run build:pages` |
| Build output directory | `apps/warga/dist` |
| Deploy command | **kosong** (paling benar) **atau** `npm run deploy:pages` |
| Node version | `20` (file `.nvmrc` atau env `NODE_VERSION=20`) |

Variabel lingkungan (Production + Preview):

- `NODE_VERSION` = `20`
- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` — warga
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — pom

`build:pages` membangun warga + pom, lalu menyalin `apps/pom/dist` ke `apps/warga/dist/pom`.

Jangan isi **Deploy command** dengan `npx wrangler deploy` — itu mode Workers dan menyebabkan error monorepo + URL `*.izayrcy08.workers.dev`.

## Struktur

```
apps/warga/       Astro — situs warga (SEO)
apps/pom/         Vite React PWA — aplikasi petugas SPBU
packages/tokens/  CSS variables + font (Barlow Condensed, Source Sans 3)
packages/ui/      shadcn/ui components (base-nova)
supabase/         Konfigurasi Supabase
docs/             DESIGN, ROADMAP, SECURITY-CHECKLIST
scripts/          merge-pages.mjs (Cloudflare)
```

## SPBU

1. PERUSDA
2. JL PENDREH
3. JL PRAMUKA
4. KM 2 JL BRIGJEN KATAMSO
5. JINGAH
