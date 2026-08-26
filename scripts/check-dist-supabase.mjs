/**
 * Tolak deploy jika dist tidak memuat env Supabase (hasil build tanpa .env).
 */
import { readdirSync, readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const wargaDist = join(process.cwd(), "apps", "warga", "dist")
const pomAssets = join(wargaDist, "pom", "assets")

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

if (!existsSync(wargaDist)) {
  fail("Missing apps/warga/dist — jalankan npm run build dulu")
}
if (!existsSync(pomAssets)) {
  fail("Missing apps/warga/dist/pom/assets — jalankan npm run build dulu")
}

function findJs(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => join(dir, f))
}

const pomJs = findJs(pomAssets)
if (pomJs.length === 0) fail("Tidak ada bundle JS pom di dist")

const pomText = pomJs.map((f) => readFileSync(f, "utf8")).join("\n")
if (!/https:\/\/[a-z0-9.-]+\.supabase\.co/i.test(pomText)) {
  fail(
    "Deploy ditolak: bundle /pom tidak memuat VITE_SUPABASE_URL.\n" +
      "Pastikan .env root punya VITE_SUPABASE_* lalu npm run build ulang.\n" +
      "Kalau pakai Cloudflare Git Builds, set env itu di dashboard sebelum build.",
  )
}

// Warga islands bisa inline di HTML atau chunk — cek HTML + JS di dist
function walkHtmlJs(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name)
    if (name.isDirectory()) {
      if (name.name === "pom") continue
      walkHtmlJs(p, acc)
    } else if (/\.(html|js)$/.test(name.name)) {
      acc.push(p)
    }
  }
  return acc
}

const wargaFiles = walkHtmlJs(wargaDist)
const wargaText = wargaFiles.map((f) => readFileSync(f, "utf8")).join("\n")
if (!/https:\/\/[a-z0-9.-]+\.supabase\.co/i.test(wargaText)) {
  fail(
    "Deploy ditolak: bundle warga tidak memuat PUBLIC_SUPABASE_URL.\n" +
      "Pastikan .env root punya PUBLIC_SUPABASE_* lalu npm run build ulang.",
  )
}

console.log("Dist OK — env Supabase ter-bake di warga + pom.")
