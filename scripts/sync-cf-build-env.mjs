/**
 * Sinkron env Supabase dari .env root ke Cloudflare Workers Git Builds.
 *
 * Butuh CLOUDFLARE_API_TOKEN (user-scoped) dengan permission:
 * - Workers Builds Configuration: Edit
 * - Workers Scripts: Read
 *
 * Buat di: https://dash.cloudflare.com/profile/api-tokens
 *
 * Usage: node scripts/sync-cf-build-env.mjs
 */
import { readFileSync, existsSync } from "node:fs"
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

loadDotEnv(join(process.cwd(), ".env"))

const token = process.env.CLOUDFLARE_API_TOKEN?.trim()
if (!token) {
  console.error("CLOUDFLARE_API_TOKEN belum di-set di .env")
  console.error("Buat token user-scoped dengan Workers Builds Configuration: Edit")
  process.exit(1)
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
    throw new Error(JSON.stringify(json.errors ?? json))
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
