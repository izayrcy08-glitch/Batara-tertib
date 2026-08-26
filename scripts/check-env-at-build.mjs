/**
 * Gagal-cepat saat build tanpa env Supabase (lokal atau Cloudflare Git Builds).
 * Lokal: baca .env root. CF: pakai Variables dashboard → process.env.
 */
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const need = [
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

const missing = need.filter((k) => !process.env[k]?.trim())
if (missing.length) {
  console.error("Build ditolak: env Supabase belum di-set:")
  for (const k of missing) console.error(`  - ${k}`)
  console.error(
    "Isi .env di root (lokal) atau Variables di Cloudflare Workers Git Builds.",
  )
  process.exit(1)
}

console.log("Env Supabase OK untuk build.")
