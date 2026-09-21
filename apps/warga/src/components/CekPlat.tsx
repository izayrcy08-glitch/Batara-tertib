import { useState } from "react"
import { supabase } from "../lib/supabase"

type RiwayatRow = {
  waktu: string
  jenis: "isi" | "tolak"
  liter: number | null
  produk: string
  spbu_nama: string
  catatan: string | null
}

type RpcResult =
  | { status: "not_found" }
  | { status: "ambiguous"; candidates: string[] }
  | { status: "ok"; plat_lengkap: string; riwayat: RiwayatRow[] }

const LOAD_FAIL = "Tidak bisa memuat. Coba lagi."
const NOT_FOUND = "Plat tidak terdaftar"
const KOSONG = "Belum ada riwayat 7 hari terakhir"

function formatWaktu(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function CekPlat() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notFound, setNotFound] = useState(false)
  const [candidates, setCandidates] = useState<string[]>([])
  const [plat, setPlat] = useState("")
  const [riwayat, setRiwayat] = useState<RiwayatRow[]>([])
  const [searched, setSearched] = useState(false)

  async function handleSearch(searchQuery?: string) {
    const q = (searchQuery ?? query).trim()
    if (!q) return

    if (!supabase) {
      setError("Laporan belum terhubung ke server")
      return
    }

    setLoading(true)
    setError("")
    setNotFound(false)
    setCandidates([])
    setPlat("")
    setRiwayat([])
    setSearched(true)

    const { data, error: rpcErr } = await supabase.rpc("cek_plat_riwayat", { p_query: q })

    setLoading(false)

    if (rpcErr) {
      setError(LOAD_FAIL)
      return
    }

    const result = data as RpcResult | null
    if (!result || result.status === "not_found") {
      setNotFound(true)
      return
    }

    if (result.status === "ambiguous") {
      setCandidates(result.candidates ?? [])
      return
    }

    setPlat(result.plat_lengkap)
    setRiwayat(result.riwayat ?? [])
  }

  function pickCandidate(platLengkap: string) {
    setQuery(platLengkap)
    void handleSearch(platLengkap)
  }

  const inputClass =
    "h-14 flex-1 rounded-lg border border-[var(--bt-tinta)]/15 bg-white px-4 text-xl tracking-widest text-center uppercase outline-none focus:border-[var(--bt-fascia)] focus:ring-2 focus:ring-[var(--bt-fascia)]/20 placeholder:text-[var(--bt-tinta)]/30 placeholder:text-base placeholder:tracking-normal"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="plat" className="text-sm font-medium">
          Nomor plat atau angka
        </label>
        <div className="flex gap-2">
          <input
            id="plat"
            name="plat"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void handleSearch()
              }
            }}
            placeholder="Contoh: 3455 atau KH 3455 DGF"
            className={inputClass}
            style={{ fontFamily: "var(--bt-font-display)", fontVariantNumeric: "tabular-nums" }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={loading || !query.trim()}
            className="h-14 px-5 rounded-lg font-bold text-sm tracking-wide uppercase text-[var(--bt-struk)] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: "var(--bt-fascia)", fontFamily: "var(--bt-font-display)" }}
            aria-label="Cari plat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-dashed border-[var(--bt-tinta)]/15 bg-white/40 px-5 py-8 text-center">
          <p className="text-sm text-[var(--bt-tinta)]/50">{error}</p>
        </div>
      ) : loading ? (
        <p className="text-sm text-center py-8 text-[var(--bt-tinta)]/45">Memuat…</p>
      ) : notFound ? (
        <div className="rounded-lg border border-dashed border-[var(--bt-tinta)]/15 bg-white/40 px-5 py-8 text-center">
          <p className="text-sm text-[var(--bt-tinta)]/50">{NOT_FOUND}</p>
        </div>
      ) : candidates.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-[var(--bt-tinta)]/60">
            Lebih dari satu plat cocok. Pilih plat lengkap:
          </p>
          {candidates.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pickCandidate(c)}
              className="rounded-lg border border-[var(--bt-tinta)]/10 bg-white px-4 py-3 text-left hover:border-[var(--bt-fascia)]/40 transition-colors"
            >
              <p
                className="text-lg font-bold tracking-wider"
                style={{ fontFamily: "var(--bt-font-display)", fontVariantNumeric: "tabular-nums" }}
              >
                {c}
              </p>
            </button>
          ))}
        </div>
      ) : plat ? (
        <div className="flex flex-col gap-3">
          <p
            className="text-lg font-bold tracking-wider"
            style={{ fontFamily: "var(--bt-font-display)", fontVariantNumeric: "tabular-nums" }}
          >
            {plat}
          </p>
          {riwayat.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--bt-tinta)]/15 bg-white/40 px-5 py-8 text-center">
              <p className="text-sm text-[var(--bt-tinta)]/50">{KOSONG}</p>
            </div>
          ) : (
            riwayat.map((r, i) => (
              <div
                key={`${r.waktu}-${r.jenis}-${i}`}
                className="rounded-lg border border-[var(--bt-tinta)]/10 bg-white px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs text-[var(--bt-tinta)]/55">
                    {formatWaktu(r.waktu)} · {r.spbu_nama}
                  </p>
                  {r.jenis === "tolak" && r.catatan ? (
                    <p className="text-sm mt-0.5 text-[var(--bt-tinta)]/70">{r.catatan}</p>
                  ) : null}
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <p
                    className="text-sm font-bold"
                    style={{
                      fontFamily: "var(--bt-font-display)",
                      color: r.jenis === "tolak" ? "var(--bt-tolak)" : "var(--bt-fascia)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {r.jenis === "tolak" ? "TOLAK" : r.liter != null ? `${r.liter} L` : "ISI"}
                  </p>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded"
                    style={{
                      background:
                        r.jenis === "tolak"
                          ? "color-mix(in srgb, var(--bt-tolak) 15%, transparent)"
                          : r.produk === "Pertamax"
                            ? "color-mix(in srgb, var(--bt-biru) 15%, transparent)"
                            : "color-mix(in srgb, var(--bt-hijau) 15%, transparent)",
                      color:
                        r.jenis === "tolak"
                          ? "var(--bt-tolak)"
                          : r.produk === "Pertamax"
                            ? "var(--bt-biru)"
                            : "var(--bt-hijau)",
                    }}
                  >
                    {r.produk}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : !searched ? (
        <div className="rounded-lg border border-dashed border-[var(--bt-tinta)]/15 bg-white/40 px-5 py-8 text-center">
          <p
            className="text-sm font-semibold text-[var(--bt-tinta)]/50 mb-1"
            style={{ fontFamily: "var(--bt-font-display)" }}
          >
            Hasil pencarian
          </p>
          <p className="text-xs text-[var(--bt-tinta)]/40">
            Ketik plat di atas — riwayat pengisian akan tampil di sini.
          </p>
        </div>
      ) : null}
    </div>
  )
}
