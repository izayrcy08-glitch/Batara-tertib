import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnv(path) {
  const raw = readFileSync(path, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    out[key] = val;
  }
  return out;
}

const env = readEnv(".env");
const url = env.VITE_SUPABASE_URL || env.PUBLIC_SUPABASE_URL;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  throw new Error("VITE_SUPABASE_URL/PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib ada di .env");
}

const supabase = createClient(url, serviceRole);

const defaultPassword = "Batara123!";

const users = [
  {
    email: "admin@batara.id",
    password: defaultPassword,
    user_metadata: { nama: "Admin Batara", role: "admin", spbu_id: null },
  },
  {
    email: "petugas.perusda@batara.id",
    password: defaultPassword,
    user_metadata: { nama: "Petugas Perusda", role: "petugas", spbu_id: "a0000000-0000-0000-0000-000000000001" },
  },
  {
    email: "petugas.pendreh@batara.id",
    password: defaultPassword,
    user_metadata: { nama: "Petugas Jl Pendreh", role: "petugas", spbu_id: "a0000000-0000-0000-0000-000000000002" },
  },
  {
    email: "petugas.pramuka@batara.id",
    password: defaultPassword,
    user_metadata: { nama: "Petugas Jl Pramuka", role: "petugas", spbu_id: "a0000000-0000-0000-0000-000000000003" },
  },
  {
    email: "petugas.jingah@batara.id",
    password: defaultPassword,
    user_metadata: { nama: "Petugas Jingah", role: "petugas", spbu_id: "a0000000-0000-0000-0000-000000000004" },
  },
  {
    email: "petugas.lanjas@batara.id",
    password: defaultPassword,
    user_metadata: { nama: "Petugas Lanjas", role: "petugas", spbu_id: "a0000000-0000-0000-0000-000000000005" },
  },
];

for (const payload of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    ...payload,
    email_confirm: true,
  });

  if (error) {
    console.log(`SKIP/ERROR ${payload.email}: ${error.message}`);
  } else {
    console.log(`CREATED ${payload.email} -> ${data.user?.id}`);
  }
}

console.log("\nPassword default semua akun: Batara123!");
