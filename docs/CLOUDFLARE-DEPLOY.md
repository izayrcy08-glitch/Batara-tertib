# Deploy otomatis — GitHub Actions (disarankan)

Cloudflare **Git Builds** sulit di-sync env lewat OAuth Wrangler (butuh API token khusus **Workers CI Write**). Solusi yang dipakai repo ini: **GitHub Actions** deploy saat push `master`.

## Setup sekali

### 1. Token Cloudflare untuk deploy

Dashboard → [API Tokens](https://dash.cloudflare.com/profile/api-tokens) → **Edit Cloudflare Workers** → scope account **Batara Tertib** (`95caf137…`).

Tambah ke `.env`:

```
CLOUDFLARE_API_TOKEN=...
```

### 2. Push secrets ke GitHub

```powershell
npm run sync:github-secrets
```

Mengisi: `PUBLIC_SUPABASE_*`, `VITE_SUPABASE_*`, `CLOUDFLARE_API_TOKEN`.

### 3. Matikan Cloudflare Git Builds

Supaya push tidak deploy dua kali (GH Actions + CF):

Workers → **batara-tertib** → **Settings** → **Builds** → disconnect repo **atau** nonaktifkan auto-deploy.

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

## Alternatif: tetap pakai Cloudflare Git Builds

Butuh token user-scoped (**Workers Builds Configuration: Edit** / Workers CI Write) — **bukan** OAuth Wrangler.

```powershell
# isi CLOUDFLARE_API_TOKEN di .env dulu
npm run sync:cf-build-env
```

Lalu matikan GitHub Actions deploy jika hanya mau satu pipeline.

## Deploy manual (darurat)

```powershell
npm run build
npm run deploy
```
