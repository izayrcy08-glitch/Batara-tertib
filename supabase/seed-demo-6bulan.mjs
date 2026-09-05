/**
 * Wipe data operasional + seed transaksi 6 bulan (Pertalite & Pertamax ~3000 L/hari),
 * lalu tulis PDF kredensial login dari profiles yang sudah ada.
 *
 * Jalankan: node supabase/seed-demo-6bulan.mjs
 * Butuh: VITE_SUPABASE_URL / PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY di .env
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SITE_URL = "https://batara-tertib.bataratertib.workers.dev";
const POM_URL = `${SITE_URL}/pom/`;
const DEFAULT_PASSWORD = "Batara123!";
const PRODUK = ["Pertalite", "Pertamax"];
const TARGET_LITER_PER_HARI = 3000;
const KENDARAAN_POOL = 480;
const BATCH = 500;
const DAYS = 183; // ~6 bulan
const PDF_PATH = join(__dirname, "kredensial-login.pdf");

function readEnv(path) {
  const raw = readFileSync(path, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

const env = readEnv(join(ROOT, ".env"));
const url = env.VITE_SUPABASE_URL || env.PUBLIC_SUPABASE_URL;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  throw new Error("VITE_SUPABASE_URL/PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib ada di .env");
}

const supabase = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Tanggal kalender WIB sebagai YYYY-MM-DD untuk offset hari dari hari ini. */
function wibDateOffset(daysAgo) {
  const now = new Date();
  const wibMs = now.getTime() + 7 * 60 * 60 * 1000;
  const wib = new Date(wibMs);
  wib.setUTCDate(wib.getUTCDate() - daysAgo);
  return `${wib.getUTCFullYear()}-${pad2(wib.getUTCMonth() + 1)}-${pad2(wib.getUTCDate())}`;
}

/** Jam WIB → ISO UTC. */
function wibToUtcIso(dateStr, hour, minute, second) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - 7, minute, second)).toISOString();
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function gaussian(mean, stdev) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stdev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function randomLiter() {
  return clamp(Math.round(15 + Math.random() * 20), 8, 45);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function angkaFromPlat(plat) {
  return plat.replace(/\D/g, "");
}

function generatePlats(n) {
  const prefixes = ["KH", "KT"];
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const seen = new Set();
  const out = [];
  let guard = 0;
  while (out.length < n && guard < n * 50) {
    guard++;
    const pref = prefixes[out.length % prefixes.length];
    const num = 1 + Math.floor(Math.random() * 9999);
    const a = letters[Math.floor(Math.random() * letters.length)];
    const b = letters[Math.floor(Math.random() * letters.length)];
    const plat = `${pref} ${num} ${a}${b}`;
    if (seen.has(plat)) continue;
    seen.add(plat);
    out.push(plat);
  }
  if (out.length < n) throw new Error(`Gagal generate ${n} plat unik`);
  return out;
}

async function wipeTable(table) {
  let total = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select("id").limit(1000);
    if (error) throw new Error(`select ${table}: ${error.message}`);
    if (!data?.length) break;
    const ids = data.map((r) => r.id);
    const { error: delErr } = await supabase.from(table).delete().in("id", ids);
    if (delErr) throw new Error(`delete ${table}: ${delErr.message}`);
    total += ids.length;
    process.stdout.write(`\r  wipe ${table}: ${total}`);
  }
  console.log(`\r  wipe ${table}: ${total} baris`);
}

async function wipeAduanStorage() {
  try {
    const { data: listed, error } = await supabase.storage.from("aduan").list("", { limit: 1000 });
    if (error) {
      console.log(`  storage aduan: skip (${error.message})`);
      return;
    }
    if (!listed?.length) {
      console.log("  storage aduan: kosong");
      return;
    }
    // folder-style: list each "folder" then files
    const paths = [];
    for (const item of listed) {
      if (item.id === null && item.name) {
        const { data: files } = await supabase.storage.from("aduan").list(item.name, { limit: 1000 });
        for (const f of files || []) {
          if (f.name) paths.push(`${item.name}/${f.name}`);
        }
      } else if (item.name) {
        paths.push(item.name);
      }
    }
    if (!paths.length) {
      console.log("  storage aduan: kosong");
      return;
    }
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      const { error: rmErr } = await supabase.storage.from("aduan").remove(chunk);
      if (rmErr) console.log(`  storage remove warn: ${rmErr.message}`);
    }
    console.log(`  storage aduan: hapus ${paths.length} objek`);
  } catch (e) {
    console.log(`  storage aduan: skip (${e.message})`);
  }
}

async function insertBatches(table, rows) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`insert ${table} @${i}: ${error.message}`);
  }
}

/** PDF text sederhana tanpa dependensi. */
function escapePdfText(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildSimplePdf(lines) {
  const fontSize = 9;
  const leading = 11;
  const marginLeft = 40;
  const pageHeight = 842;
  const top = 800;
  const bottom = 40;
  const linesPerPage = Math.floor((top - bottom) / leading);
  const pages = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (!pages.length) pages.push([""]);

  const contentStreams = pages.map((pageLines) => {
    const parts = ["BT", `/F1 ${fontSize} Tf`, `${marginLeft} ${top} Td`, `${leading} TL`];
    let first = true;
    for (const line of pageLines) {
      const t = escapePdfText(line);
      if (first) {
        parts.push(`(${t}) Tj`);
        first = false;
      } else {
        parts.push(`T* (${t}) Tj`);
      }
    }
    parts.push("ET");
    return parts.join("\n");
  });

  const objects = [];
  // 1 catalog, 2 pages, then page objs, content objs, font
  const pageObjNums = pages.map((_, i) => 3 + i);
  const contentObjNums = pages.map((_, i) => 3 + pages.length + i);
  const fontObjNum = 3 + pages.length * 2;

  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj\n`,
  );
  for (let i = 0; i < pages.length; i++) {
    objects.push(
      `${pageObjNums[i]} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ${pageHeight}] /Contents ${contentObjNums[i]} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>\nendobj\n`,
    );
  }
  for (let i = 0; i < pages.length; i++) {
    const stream = contentStreams[i];
    const streamLen = Buffer.byteLength(stream, "utf8");
    objects.push(
      `${contentObjNums[i]} 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}\nendstream\nendobj\n`,
    );
  }
  objects.push(
    `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`,
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

async function writeCredentialsPdf(admins, petugasBySpbu, spbuMap) {
  const lines = [
    "BATARA TERTIB - Kredensial Login",
    `Dibuat: ${new Date().toISOString()}`,
    "",
    "Alamat website (warga):",
    `  ${SITE_URL}`,
    "Login petugas / admin:",
    `  ${POM_URL}`,
    "",
    `Sandi default seed: ${DEFAULT_PASSWORD}`,
    "(Akun tidak di-reset. Jika sandi sudah diganti, pakai yang berlaku.)",
    "",
    "=== ADMIN ===",
  ];
  if (!admins.length) lines.push("  (tidak ada admin aktif)");
  for (const a of admins) {
    lines.push(`  ${a.nama}`);
    lines.push(`  Email : ${a.email || "(tanpa email)"}`);
    lines.push(`  Role  : admin`);
    lines.push("");
  }
  lines.push("=== PETUGAS PER SPBU ===");
  const spbuIds = [...spbuMap.keys()].sort((a, b) => spbuMap.get(a).localeCompare(spbuMap.get(b)));
  for (const sid of spbuIds) {
    lines.push("");
    lines.push(`SPBU: ${spbuMap.get(sid)}`);
    const list = petugasBySpbu.get(sid) || [];
    if (!list.length) {
      lines.push("  (tidak ada petugas aktif)");
      continue;
    }
    for (const p of list) {
      lines.push(`  - ${p.nama}`);
      lines.push(`    Email : ${p.email || "(tanpa email)"}`);
      lines.push(`    Role  : petugas`);
    }
  }
  writeFileSync(PDF_PATH, buildSimplePdf(lines));
  console.log(`PDF ditulis: ${PDF_PATH}`);
}

async function main() {
  const pdfOnly = process.argv.includes("--pdf-only");
  console.log(pdfOnly ? "=== Batara Tertib: regenerate PDF kredensial ===\n" : "=== Batara Tertib: wipe + seed 6 bulan ===\n");

  // --- Load SPBU + profiles ---
  const { data: spbuRows, error: spbuErr } = await supabase
    .from("spbu")
    .select("id, nama, aktif")
    .eq("aktif", true)
    .order("nama");
  if (spbuErr) throw new Error(spbuErr.message);
  if (!spbuRows?.length) throw new Error("Tidak ada SPBU aktif");

  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, nama, role, spbu_id, email, aktif")
    .eq("aktif", true);
  if (profErr) throw new Error(profErr.message);

  const admins = (profiles || []).filter((p) => p.role === "admin");
  const petugas = (profiles || []).filter((p) => p.role === "petugas" && p.spbu_id);
  const petugasBySpbu = new Map();
  for (const p of petugas) {
    if (!petugasBySpbu.has(p.spbu_id)) petugasBySpbu.set(p.spbu_id, []);
    petugasBySpbu.get(p.spbu_id).push(p);
  }

  const spbuMap = new Map(spbuRows.map((s) => [s.id, s.nama]));
  for (const s of spbuRows) {
    const list = petugasBySpbu.get(s.id) || [];
    if (!list.length) throw new Error(`SPBU tanpa petugas aktif: ${s.nama} (${s.id})`);
  }

  console.log(`SPBU aktif: ${spbuRows.length}`);
  console.log(`Admin: ${admins.length}, Petugas: ${petugas.length}`);

  if (pdfOnly) {
    await writeCredentialsPdf(admins, petugasBySpbu, spbuMap);
    console.log("Selesai (pdf-only).");
    return;
  }

  // --- Wipe ---
  console.log("\nWipe data operasional…");
  await wipeTable("aduan");
  await wipeAduanStorage();
  await wipeTable("tolakan");
  await wipeTable("transaksi");
  await wipeTable("kendaraan");

  // --- Kendaraan ---
  console.log(`\nSeed ${KENDARAAN_POOL} kendaraan…`);
  const plats = generatePlats(KENDARAAN_POOL);
  const kendaraanRows = plats.map((plat) => ({
    plat_lengkap: plat,
    angka_plat: angkaFromPlat(plat),
    foto_url: null,
  }));
  await insertBatches("kendaraan", kendaraanRows);

  const { data: kendaraan, error: kenErr } = await supabase.from("kendaraan").select("id");
  if (kenErr) throw new Error(kenErr.message);
  if (!kendaraan?.length) throw new Error("Kendaraan kosong setelah insert");
  // fetch all if paginated
  let allKendaraan = kendaraan;
  if (kendaraan.length < KENDARAAN_POOL) {
    allKendaraan = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("kendaraan")
        .select("id")
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      allKendaraan.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  const kendaraanIds = allKendaraan.map((k) => k.id);
  console.log(`  kendaraan siap: ${kendaraanIds.length}`);

  // --- Transaksi 6 bulan ---
  console.log(`\nSeed transaksi ${DAYS} hari × ${PRODUK.join(" & ")} (~${TARGET_LITER_PER_HARI} L/hari/jenis)…`);
  let totalTx = 0;
  let totalLiter = { Pertalite: 0, Pertamax: 0 };
  const pending = [];

  async function flush() {
    if (!pending.length) return;
    const chunk = pending.splice(0, pending.length);
    await insertBatches("transaksi", chunk);
    totalTx += chunk.length;
    process.stdout.write(`\r  transaksi: ${totalTx} baris`);
  }

  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
    const dateStr = wibDateOffset(daysAgo);
    const usedToday = new Set();
    const pool = shuffle([...kendaraanIds]);

    for (const produk of PRODUK) {
      const target = Math.round(clamp(gaussian(TARGET_LITER_PER_HARI, TARGET_LITER_PER_HARI * 0.12), 2400, 3600));
      let sum = 0;
      let guard = 0;
      while (sum < target && guard < pool.length * 2) {
        guard++;
        let kid = null;
        while (pool.length && usedToday.has(pool[pool.length - 1])) pool.pop();
        // pick unused from remaining shuffled pool
        while (pool.length) {
          const candidate = pool.pop();
          if (!usedToday.has(candidate)) {
            kid = candidate;
            break;
          }
        }
        if (!kid) {
          // reshuffle unused from full list
          const unused = shuffle(kendaraanIds.filter((id) => !usedToday.has(id)));
          if (!unused.length) break;
          kid = unused.pop();
          pool.push(...unused);
        }

        const liter = randomLiter();
        const remain = target - sum;
        const useLiter = remain < 8 ? liter : Math.min(liter, Math.max(8, remain));
        // last fill: nudge to approach target without huge overshoot
        const finalLiter =
          sum + useLiter > target + 40 && remain >= 8 ? Math.max(8, remain) : useLiter;

        const spbu = spbuRows[Math.floor(Math.random() * spbuRows.length)];
        const petugasList = petugasBySpbu.get(spbu.id);
        const user = petugasList[Math.floor(Math.random() * petugasList.length)];

        const hour = 6 + Math.floor(Math.random() * 15); // 06–20 WIB
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);

        pending.push({
          kendaraan_id: kid,
          spbu_id: spbu.id,
          user_id: user.id,
          liter: finalLiter,
          produk,
          created_at: wibToUtcIso(dateStr, hour, minute, second),
        });
        usedToday.add(kid);
        sum += finalLiter;
        totalLiter[produk] += finalLiter;

        if (pending.length >= BATCH) await flush();
      }
    }
  }
  await flush();
  console.log(`\n  selesai: ${totalTx} transaksi`);
  console.log(`  total Pertalite: ${totalLiter.Pertalite} L (rata ${Math.round(totalLiter.Pertalite / DAYS)} L/hari)`);
  console.log(`  total Pertamax : ${totalLiter.Pertamax} L (rata ${Math.round(totalLiter.Pertamax / DAYS)} L/hari)`);

  // --- PDF ---
  console.log("\nGenerate PDF kredensial…");
  await writeCredentialsPdf(admins, petugasBySpbu, spbuMap);

  // --- Verify sample ---
  const { count } = await supabase.from("transaksi").select("*", { count: "exact", head: true });
  console.log(`\nVerifikasi COUNT transaksi: ${count}`);
  console.log("Selesai.");
}

main().catch((err) => {
  console.error("\nGAGAL:", err.message || err);
  process.exit(1);
});
