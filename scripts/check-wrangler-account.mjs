/**
 * Blok deploy jika wrangler login ke akun Cloudflare yang salah.
 * Akun Batara Tertib: izayrcy08@gmail.com
 */
import { execSync } from "node:child_process"

const BATARA_ACCOUNT_ID = "95caf13786fcd5ba9573aff3a6390524"

let out = ""
try {
  out = execSync("npx wrangler whoami", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] })
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  console.error("Gagal cek akun wrangler. Jalankan: npx wrangler login")
  console.error(msg)
  process.exit(1)
}

if (!out.includes(BATARA_ACCOUNT_ID)) {
  console.error("Deploy ditolak: wrangler tidak login ke akun Batara Tertib.")
  console.error(`Harus Account ID: ${BATARA_ACCOUNT_ID} (izayrcy08@gmail.com)`)
  console.error("Jalankan: npx wrangler logout ; npx wrangler login")
  process.exit(1)
}

console.log("Akun Cloudflare OK (Batara Tertib).")
