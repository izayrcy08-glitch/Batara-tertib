/**
 * Sinkron env Supabase dari .env root ke Cloudflare Workers Git Builds.
 *
 * Token (urutan):
 * 1. CLOUDFLARE_API_TOKEN di .env (user-scoped, permission Workers Builds Configuration: Edit)
 * 2. OAuth Wrangler sudah login (`npx wrangler whoami`)
 *
 * Usage: npm run sync:cf-build-env
 */
import { readFileSync, existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const ACCOUNT_ID = "95caf13786fcd5ba9573aff3a6390524"
const WORKER_NAME = "batara-tertib"

const BUILD_VARS = [
  "NODE_VERSION",
  "PUBLIC_SUPABASE_URL",
  "PUBLIC_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
]

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return
  const text = readFileSync(filePath, "utf8")
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i <= 0) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function wranglerOAuthToken() {
  const candidates = [
    join(homedir(), ".wrangler", "config", "default.toml"),
    join(homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config", "default.toml"),
  ]
  for (const file of candidates) {
    if (!existsSync(file)) continue
    const text = readFileSync(file, "utf8")
    const match = text.match(/^oauth_token\s*=\s*"([^"]+)"/m)
    if (match?.[1]) return match[1]
  }
  return null
}

loadDotEnv(join(process.cwd(), ".env"))

const token = process.env.CLOUDFLARE_API_TOKEN?.trim() || wranglerOAuthToken()
if (!token) {
  console.error("Token Cloudflare tidak ditemukan.")
  console.error("Isi CLOUDFLARE_API_TOKEN di .env, atau jalankan: npx wrangler login")
  process.exit(1)
}

if (!process.env.CLOUDFLARE_API_TOKEN?.trim()) {
  console.log("Pakai OAuth Wrangler — mungkin ditolak Builds API (butuh Workers CI Write).")
}

const values = {
  NODE_VERSION: process.env.NODE_VERSION?.trim() || "20",
  PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL?.trim(),
  PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY?.trim(),
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL?.trim() || process.env.PUBLIC_SUPABASE_URL?.trim(),
  VITE_SUPABASE_ANON_KEY:
    process.env.VITE_SUPABASE_ANON_KEY?.trim() || process.env.PUBLIC_SUPABASE_ANON_KEY?.trim(),
}

const missing = BUILD_VARS.filter((k) => k !== "NODE_VERSION" && !values[k])
if (missing.length) {
  console.error("Env Supabase belum lengkap di .env:", missing.join(", "))
  process.exit(1)
}

async function cf(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
  const json = await res.json()
  if (!json.success) {
    const msg = JSON.stringify(json.errors ?? json)
    if (msg.includes("Authentication error") && !process.env.CLOUDFLARE_API_TOKEN?.trim()) {
      throw new Error(
        "OAuth Wrangler tidak cukup. Buat CLOUDFLARE_API_TOKEN (Workers CI Write) di .env, " +
          "atau pakai GitHub Actions: npm run sync:github-secrets — lihat docs/CLOUDFLARE-DEPLOY.md",
      )
    }
    throw new Error(msg)
  }
  return json.result
}

const scripts = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts`)
const worker = scripts.find((s) => s.id === WORKER_NAME)
if (!worker?.tag) {
  console.error(`Worker "${WORKER_NAME}" tidak ditemukan di akun ${ACCOUNT_ID}`)
  process.exit(1)
}

const triggers = await cf(`/accounts/${ACCOUNT_ID}/builds/workers/${worker.tag}/triggers`)
if (!triggers?.length) {
  console.error("Tidak ada Git Builds trigger. Aktifkan dulu di dashboard Workers > batara-tertib > Settings > Builds")
  process.exit(1)
}

const payload = Object.fromEntries(
  BUILD_VARS.map((key) => [
    key,
    {
      value: values[key],
      is_secret: key.includes("KEY"),
    },
  ]),
)

for (const trigger of triggers) {
  const name = trigger.trigger_name ?? trigger.trigger_uuid
  await cf(
    `/accounts/${ACCOUNT_ID}/builds/triggers/${trigger.trigger_uuid}/environment_variables`,
    { method: "PATCH", body: JSON.stringify(payload) },
  )
  console.log(`OK — env diset untuk trigger: ${name}`)
}

console.log("\nSelesai. Push ke master sekarang boleh memicu Git Builds dengan env Supabase.")
