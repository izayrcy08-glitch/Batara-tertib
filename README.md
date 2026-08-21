# Batara Tertib

Pengawasan distribusi BBM 5 SPBU di Kabupaten Barito Utara, Muara Teweh.

## Stack

- **Warga:** Astro static (SEO, HTML ringan)
- **Petugas:** Vite React PWA di `/pom`
- **Backend:** Supabase (Auth, Postgres, Storage)
- **Hosting:** Cloudflare Workers + static assets

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
# = warga + pom digabung ke apps/warga/dist (termasuk apps/warga/dist/pom)
```

## Cloudflare Workers (Git Builds)

Proyek baru memakai **Workers + static assets** (bukan alur Pages lama). Config: [`wrangler.toml`](wrangler.toml) → `assets.directory = ./apps/warga/dist`.

| Setting di dashboard | Nilai |
|----------------------|--------|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Version command | `npx wrangler versions upload` |
| Root directory | `/` (root monorepo) |
| Node | `20` (`.nvmrc` / env `NODE_VERSION=20`) |

Variabel lingkungan (Production + Preview):

- `NODE_VERSION` = `20`
- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` — warga
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — pom

URL production (subdomain akun Cloudflare, diganti 2026-08-21):

`https://batara-tertib.bataratertib.workers.dev`

Preview: `https://*-batara-tertib.bataratertib.workers.dev`

Subdomain akun lama `izayrcy08.workers.dev` sudah tidak dipakai. Untuk URL tanpa bagian tengah, pasang **custom domain**.

Deploy manual:

```powershell
npm run build
npm run deploy
```

## Struktur

```
apps/warga/       Astro — situs warga (SEO)
apps/pom/         Vite React PWA — aplikasi petugas SPBU
packages/tokens/  CSS variables + font (Barlow Condensed, Source Sans 3)
packages/ui/      shadcn/ui components (base-nova)
supabase/         Konfigurasi Supabase
docs/             DESIGN, ROADMAP, SECURITY-CHECKLIST
scripts/          merge-pages.mjs (gabung output ke dist)
wrangler.toml     Workers static assets
```

## SPBU

1. PERUSDA
2. JL PENDREH
3. JL PRAMUKA
4. KM 2 JL BRIGJEN KATAMSO
5. JINGAH
