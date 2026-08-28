/**
 * Push build/deploy secrets dari .env ke GitHub Actions (repo ini).
 * Butuh: gh CLI login + .env lengkap + CLOUDFLARE_API_TOKEN (template Edit Cloudflare Workers).
 *
 * Usage: npm run sync:github-secrets
 */
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

const SECRETS = [
  "PUBLIC_SUPABASE_URL",
  "PUBLIC_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "CLOUDFLARE_API_TOKEN",
]

function loadDotEnv(filePath) {
  const out = {}
  if (!existsSync(filePath)) return out
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
    out[key] = val
  }
  return out
}

const env = loadDotEnv(join(process.cwd(), ".env"))

const gh = spawnSync("gh", ["auth", "status"], { encoding: "utf8" })
if (gh.status !== 0) {
  console.error("gh belum login. Jalankan: gh auth login")
  process.exit(1)
}

const missing = SECRETS.filter((k) => !env[k]?.trim())
if (missing.length) {
  console.error("Env belum lengkap di .env:", missing.join(", "))
  if (missing.includes("CLOUDFLARE_API_TOKEN")) {
    console.error(
      "Buat token: https://dash.cloudflare.com/profile/api-tokens → Edit Cloudflare Workers → account Batara Tertib",
    )
  }
  process.exit(1)
}

for (const key of SECRETS) {
  const r = spawnSync("gh", ["secret", "set", key, "--body", env[key]], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  })
  if (r.status !== 0) {
    console.error(`Gagal set secret ${key}:`, r.stderr?.trim() || r.stdout?.trim())
    process.exit(1)
  }
  console.log(`OK — GitHub secret ${key}`)
}

console.log("\nSelesai. Push ke master → GitHub Actions deploy (matikan Cloudflare Git Builds di dashboard).")
