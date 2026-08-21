/**
 * Salin hasil build pom ke apps/warga/dist/pom untuk Cloudflare Pages (satu output).
 * PowerShell-friendly: tidak pakai cp Unix.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const pomDist = join(root, "apps", "pom", "dist")
const wargaDist = join(root, "apps", "warga", "dist")
const target = join(wargaDist, "pom")

if (!existsSync(pomDist)) {
  console.error("Missing apps/pom/dist — jalankan npm run build:pom dulu")
  process.exit(1)
}
if (!existsSync(wargaDist)) {
  console.error("Missing apps/warga/dist — jalankan npm run build:warga dulu")
  process.exit(1)
}

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
cpSync(pomDist, target, { recursive: true })
console.log("Merged apps/pom/dist → apps/warga/dist/pom")
