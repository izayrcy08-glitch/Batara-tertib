import { supabase } from "./supabase"

export type ProdukFilter = "semua" | "Pertalite" | "Pertamax"
export type Spbu = { id: string; nama: string; aktif: boolean }
export type Petugas = {
  id: string
  nama: string
  email: string
  spbu_id: string
  aktif: boolean
}
export type Kendaraan = {
  id: string
  plat_lengkap: string
  angka_plat: string
  foto_url: string | null
}
export type Riwayat = {
  id: string
  sumber: "transaksi" | "tolakan"
  kendaraan_id: string
  plat: string
  spbu_id: string
  spbu_nama: string
  liter: number | null
  produk: string | null
  catatan: string | null
  created_at: string
}
export type RekapRow = {
  spbu_id: string
  spbu_nama: string
  pertalite: number
  pertamax: number
}

export const PAGE = 50

export function compactPlat(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export function angkaPlat(plat: string): string {
  return plat.replace(/[^0-9]/g, "")
}

export function safeSearch(input: string): string {
  return input.replace(/[%_,.()]/g, "").trim()
}

export function todayWib(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" })
}

export function addDaysWib(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function wibRangeIso(fromKey: string, toKey: string): { from: string; to: string } {
  return {
    from: new Date(`${fromKey}T00:00:00+07:00`).toISOString(),
    to: new Date(`${toKey}T23:59:59.999+07:00`).toISOString(),
  }
}

type FnBody =
  | { action: "create"; nama: string; email: string; password: string; spbu_id: string }
  | { action: "update"; id: string; nama: string; email: string; spbu_id: string; aktif: boolean }
  | { action: "reset_password"; id: string; password: string }
  | { action: "delete"; id: string }

export async function invokeAdminUsers(body: FnBody): Promise<{ deactivated?: boolean; deleted?: boolean }> {
  const { data, error } = await supabase.functions.invoke("admin-users", { body })
  const payload = data as { error?: string; deactivated?: boolean; deleted?: boolean } | null
  if (payload?.error) throw new Error(payload.error)
  if (error) {
    let message = "Gagal menyimpan petugas"
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === "function") {
      try {
        const j = await ctx.json() as { error?: string }
        if (j?.error) message = j.error
      } catch {
        /* ignore */
      }
    }
    throw new Error(message)
  }
  return payload ?? {}
}

export async function loadSpbu(): Promise<Spbu[]> {
  const { data, error } = await supabase
    .from("spbu")
    .select("id, nama, aktif")
    .order("nama")
  if (error) throw error
  return data ?? []
}

export async function loadPetugas(): Promise<Petugas[]> {
  const full = await supabase
    .from("profiles")
    .select("id, nama, email, spbu_id, aktif")
    .eq("role", "petugas")
    .order("nama")
  if (!full.error) {
    return (full.data ?? []).map((p) => ({
      id: p.id,
      nama: p.nama,
      email: p.email ?? "",
      spbu_id: p.spbu_id,
      aktif: p.aktif !== false,
    }))
  }

  const basic = await supabase
    .from("profiles")
    .select("id, nama, spbu_id")
    .eq("role", "petugas")
    .order("nama")
  if (basic.error) throw basic.error
  return (basic.data ?? []).map((p) => ({
    id: p.id,
    nama: p.nama,
    email: "",
    spbu_id: p.spbu_id,
    aktif: true,
  }))
}

export async function loadKendaraan(q: string, offset: number): Promise<Kendaraan[]> {
  const safe = safeSearch(q)
  let query = supabase
    .from("kendaraan")
    .select("id, plat_lengkap, angka_plat, foto_url")
    .order("plat_lengkap")
    .range(offset, offset + PAGE - 1)

  if (safe) {
    const like = `%${safe}%`
    query = query.or(`plat_lengkap.ilike.${like},angka_plat.ilike.${like}`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function loadRiwayat(opts: {
  from: string
  to: string
  spbuId: string | "semua"
  plat: string
}): Promise<Riwayat[]> {
  const { from, to } = wibRangeIso(opts.from, opts.to)
  const plat = safeSearch(opts.plat)

  let trxQuery = supabase
    .from("transaksi")
    .select("id, kendaraan_id, spbu_id, liter, produk, created_at, kendaraan:kendaraan_id(plat_lengkap), spbu:spbu_id(nama)")
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false })
    .limit(200)

  let tolakQuery = supabase
    .from("tolakan")
    .select("id, kendaraan_id, spbu_id, catatan, alasan, created_at, kendaraan:kendaraan_id(plat_lengkap), spbu:spbu_id(nama)")
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false })
    .limit(200)

  if (opts.spbuId !== "semua") {
    trxQuery = trxQuery.eq("spbu_id", opts.spbuId)
    tolakQuery = tolakQuery.eq("spbu_id", opts.spbuId)
  }

  const [trx, tolak] = await Promise.all([trxQuery, tolakQuery])
  if (trx.error) throw trx.error
  if (tolak.error) throw tolak.error

  const nestedNama = (value: unknown): string => {
    if (Array.isArray(value)) return (value[0] as { nama?: string } | undefined)?.nama ?? "-"
    return (value as { nama?: string } | null)?.nama ?? "-"
  }
  const nestedPlat = (value: unknown): string => {
    if (Array.isArray(value)) return (value[0] as { plat_lengkap?: string } | undefined)?.plat_lengkap ?? "-"
    return (value as { plat_lengkap?: string } | null)?.plat_lengkap ?? "-"
  }

  const rows: Riwayat[] = [
    ...(trx.data ?? []).map((t) => ({
      id: t.id,
      sumber: "transaksi" as const,
      kendaraan_id: t.kendaraan_id,
      plat: nestedPlat(t.kendaraan),
      spbu_id: t.spbu_id,
      spbu_nama: nestedNama(t.spbu),
      liter: t.liter,
      produk: t.produk,
      catatan: null,
      created_at: t.created_at,
    })),
    ...(tolak.data ?? []).map((t) => ({
      id: t.id,
      sumber: "tolakan" as const,
      kendaraan_id: t.kendaraan_id,
      plat: nestedPlat(t.kendaraan),
      spbu_id: t.spbu_id,
      spbu_nama: nestedNama(t.spbu),
      liter: null,
      produk: null,
      catatan: t.catatan || t.alasan,
      created_at: t.created_at,
    })),
  ]

  const filtered = plat
    ? rows.filter((r) => compactPlat(r.plat).includes(compactPlat(plat)) || r.plat.replace(/[^0-9]/g, "").includes(plat))
    : rows

  return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export const LAPORAN_LOAD_FAIL = "Tidak bisa memuat. Coba lagi."

function isRekapRpcMissing(error: { code?: string; message?: string; details?: string; hint?: string }): boolean {
  const blob = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`
  return /PGRST202|42883|rekap_bbm|Could not find the function/i.test(blob)
}

function mapRekap(rows: { spbu_id: string; spbu_nama: string; pertalite: number; pertamax: number }[]): RekapRow[] {
  return rows.map((r) => ({
    spbu_id: r.spbu_id,
    spbu_nama: r.spbu_nama,
    pertalite: r.pertalite,
    pertamax: r.pertamax,
  }))
}

function namaRelasi(value: unknown): string {
  if (Array.isArray(value)) return (value[0] as { nama?: string } | undefined)?.nama ?? "-"
  return (value as { nama?: string } | null)?.nama ?? "-"
}

/** Cadangan tanpa plat: hanya liter + produk + SPBU, jika RPC belum ada di cloud. */
async function rekapFromTransaksi(
  fromKey: string,
  toKey: string,
  spbuId: string | "semua",
  produk: ProdukFilter,
): Promise<RekapRow[]> {
  const { from, to } = wibRangeIso(fromKey, toKey)
  let query = supabase
    .from("transaksi")
    .select("liter, produk, spbu_id, spbu:spbu_id(nama)")
    .gte("created_at", from)
    .lte("created_at", to)
    .in("produk", ["Pertalite", "Pertamax"])
    .limit(2000)

  if (spbuId !== "semua") query = query.eq("spbu_id", spbuId)
  if (produk !== "semua") query = query.eq("produk", produk)

  const { data, error } = await query
  if (error) throw new Error(LAPORAN_LOAD_FAIL)

  const bag = new Map<string, RekapRow>()
  for (const row of data ?? []) {
    const id = row.spbu_id as string
    const current = bag.get(id) ?? {
      spbu_id: id,
      spbu_nama: namaRelasi(row.spbu),
      pertalite: 0,
      pertamax: 0,
    }
    if (row.produk === "Pertalite") current.pertalite += row.liter ?? 0
    if (row.produk === "Pertamax") current.pertamax += row.liter ?? 0
    bag.set(id, current)
  }

  return [...bag.values()]
    .filter((r) => r.pertalite + r.pertamax > 0)
    .sort((a, b) => a.spbu_nama.localeCompare(b.spbu_nama, "id"))
}

export async function loadRekap(
  from: string,
  to: string,
  spbuId: string | "semua",
  produk: ProdukFilter,
): Promise<RekapRow[]> {
  const { data, error } = await supabase.rpc("rekap_bbm", {
    p_from: from,
    p_to: to,
    p_spbu_id: spbuId === "semua" ? null : spbuId,
    p_produk: produk === "semua" ? null : produk,
  })
  if (!error) {
    return mapRekap((data as RekapRow[] | null) ?? [])
  }
  if (isRekapRpcMissing(error)) {
    return rekapFromTransaksi(from, to, spbuId, produk)
  }
  throw new Error(LAPORAN_LOAD_FAIL)
}
