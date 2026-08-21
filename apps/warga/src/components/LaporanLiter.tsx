import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type ProdukFilter = "semua" | "Pertalite" | "Pertamax"
type Spbu = { id: string; nama: string }
type RekapRow = { spbu_id: string; spbu_nama: string; pertalite: number; pertamax: number }

const LOAD_FAIL = "Tidak bisa memuat. Coba lagi."
const KOSONG = "Belum ada pengisian di rentang ini"

function wibToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" })
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

function wibRangeIso(fromKey: string, toKey: string): { from: string; to: string } {
  return {
    from: new Date(`${fromKey}T00:00:00+07:00`).toISOString(),
    to: new Date(`${toKey}T23:59:59.999+07:00`).toISOString(),
  }
}

function isRekapRpcMissing(error: { code?: string; message?: string; details?: string; hint?: string }): boolean {
  const blob = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`
  return /PGRST202|42883|rekap_bbm|Could not find the function/i.test(blob)
}

function namaRelasi(value: unknown): string {
  if (Array.isArray(value)) return (value[0] as { nama?: string } | undefined)?.nama ?? "-"
  return (value as { nama?: string } | null)?.nama ?? "-"
}

/** Cadangan tanpa plat — hanya liter, produk, SPBU. RPC tetap wajib setelah RLS mengunci transaksi. */
async function rekapFromTransaksi(
  fromKey: string,
  toKey: string,
  spbuId: string,
  produk: ProdukFilter,
): Promise<RekapRow[]> {
  if (!supabase) throw new Error(LOAD_FAIL)
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
  if (error) throw new Error(LOAD_FAIL)

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

async function loadRekap(
  from: string,
  to: string,
  spbuId: string,
  produk: ProdukFilter,
): Promise<RekapRow[]> {
  if (!supabase) throw new Error("Laporan belum terhubung ke server")
  const { data, error } = await supabase.rpc("rekap_bbm", {
    p_from: from,
    p_to: to,
    p_spbu_id: spbuId === "semua" ? null : spbuId,
    p_produk: produk === "semua" ? null : produk,
  })
  if (!error) return (data as RekapRow[] | null) ?? []
  if (isRekapRpcMissing(error)) return rekapFromTransaksi(from, to, spbuId, produk)
  throw new Error(LOAD_FAIL)
}

export function LaporanLiter() {
  const [from, setFrom] = useState(addDays(wibToday(), -6))
  const [to, setTo] = useState(wibToday())
  const [spbuId, setSpbuId] = useState("semua")
  const [produk, setProduk] = useState<ProdukFilter>("semua")
  const [spbu, setSpbu] = useState<Spbu[]>([])
  const [rows, setRows] = useState<RekapRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!supabase) {
      setError("Laporan belum terhubung ke server")
      setLoading(false)
      return
    }
    void supabase
      .from("spbu")
      .select("id, nama")
      .eq("aktif", true)
      .order("nama")
      .then(({ data, error: err }) => {
        if (err) setError("Tidak bisa memuat. Coba lagi.")
        else setSpbu(data ?? [])
      })
  }, [])

  useEffect(() => {
    if (!supabase) return
    setLoading(true)
    setError("")
    void loadRekap(from, to, spbuId, produk)
      .then((data) => {
        setRows(data)
        setError("")
      })
      .catch(() => {
        setRows([])
        setError(LOAD_FAIL)
      })
      .finally(() => setLoading(false))
  }, [from, to, spbuId, produk])

  const totalLite = useMemo(() => rows.reduce((s, r) => s + r.pertalite, 0), [rows])
  const totalMax = useMemo(() => rows.reduce((s, r) => s + r.pertamax, 0), [rows])

  const field =
    "h-12 w-full rounded-lg border border-[var(--bt-tinta)]/15 bg-white px-3 text-sm outline-none focus:border-[var(--bt-fascia)] focus:ring-2 focus:ring-[var(--bt-fascia)]/20"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Dari
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Sampai
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        SPBU
        <select value={spbuId} onChange={(e) => setSpbuId(e.target.value)} className={field}>
          <option value="semua">Semua SPBU</option>
          {spbu.map((s) => (
            <option key={s.id} value={s.id}>{s.nama}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Jenis BBM
        <select value={produk} onChange={(e) => setProduk(e.target.value as ProdukFilter)} className={field}>
          <option value="semua">Pertalite & Pertamax</option>
          <option value="Pertalite">Pertalite</option>
          <option value="Pertamax">Pertamax</option>
        </select>
      </label>

      {error ? (
        <div className="rounded-lg border border-dashed border-[var(--bt-tinta)]/15 bg-white/40 px-5 py-8 text-center">
          <p className="text-sm text-[var(--bt-tinta)]/50">{error}</p>
        </div>
      ) : loading ? (
        <p className="text-sm text-center py-8 text-[var(--bt-tinta)]/45">Memuat…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--bt-tinta)]/15 bg-white/40 px-5 py-8 text-center">
          <p className="text-sm text-[var(--bt-tinta)]/50">{KOSONG}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {(produk === "semua" || produk === "Pertalite") && (
              <div className="rounded-lg border border-[var(--bt-tinta)]/10 bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-[var(--bt-tinta)]/45" style={{ fontFamily: "var(--bt-font-display)" }}>
                  Pertalite
                </p>
                <p className="text-3xl font-bold" style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-hijau)", fontVariantNumeric: "tabular-nums" }}>
                  {totalLite} L
                </p>
              </div>
            )}
            {(produk === "semua" || produk === "Pertamax") && (
              <div className="rounded-lg border border-[var(--bt-tinta)]/10 bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-[var(--bt-tinta)]/45" style={{ fontFamily: "var(--bt-font-display)" }}>
                  Pertamax
                </p>
                <p className="text-3xl font-bold" style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-biru)", fontVariantNumeric: "tabular-nums" }}>
                  {totalMax} L
                </p>
              </div>
            )}
          </div>
          {rows.map((r) => (
            <div key={r.spbu_id} className="rounded-lg border border-[var(--bt-tinta)]/10 bg-white px-4 py-3">
              <p className="text-sm font-semibold">{r.spbu_nama}</p>
              <p className="text-xs mt-1 text-[var(--bt-tinta)]/55">
                {produk !== "Pertamax" ? `Pertalite ${r.pertalite} L` : null}
                {produk === "semua" ? " · " : null}
                {produk !== "Pertalite" ? `Pertamax ${r.pertamax} L` : null}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
