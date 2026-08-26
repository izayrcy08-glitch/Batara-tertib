import { useState } from "react"
import { supabase } from "../lib/supabase"

type AduanOk = {
  status: "ok"
  kode_lacak: string
  judul: string
  isi: string
  foto_url: string | null
  spbu_nama: string
  jawaban: string | null
  dijawab_at: string | null
  created_at: string
}

type RpcResult = { status: "not_found" } | AduanOk

const LOAD_FAIL = "Tidak bisa memuat. Coba lagi."
const NOT_FOUND = "Kode tidak ditemukan"

function formatWaktu(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  })
}

export function CariAduan() {
  const [kode, setKode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notFound, setNotFound] = useState(false)
  const [row, setRow] = useState<AduanOk | null>(null)
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    const q = kode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (q.length !== 8) {
      setError("Kode lacak 8 karakter")
      setNotFound(false)
      setRow(null)
      return
    }

    if (!supabase) {
      setError("Laporan belum terhubung ke server")
      return
    }

    setLoading(true)
    setError("")
    setNotFound(false)
    setRow(null)
    setSearched(true)
    setKode(q)

    const { data, error: rpcErr } = await supabase.rpc("cek_aduan", { p_kode: q })
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

    setRow(result)
  }

  const field =
    "h-14 w-full rounded-lg border border-[var(--bt-tinta)]/15 bg-white px-4 text-xl tracking-[0.25em] text-center uppercase outline-none focus:border-[var(--bt-fascia)] focus:ring-2 focus:ring-[var(--bt-fascia)]/20 placeholder:text-[var(--bt-tinta)]/30 placeholder:text-base placeholder:tracking-normal"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="kode-lacak" className="text-sm font-medium">
          Kode lacak
        </label>
        <div className="flex gap-2">
          <input
            id="kode-lacak"
            type="text"
            value={kode}
            maxLength={8}
            onChange={(e) => setKode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void handleSearch()
              }
            }}
            placeholder="Contoh: AB3K7M9P"
            className={field}
            style={{ fontFamily: "var(--bt-font-display)", fontVariantNumeric: "tabular-nums" }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={loading || kode.trim().length !== 8}
            className="h-14 px-5 rounded-lg font-bold text-sm tracking-wide uppercase text-[var(--bt-struk)] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--bt-fascia)", fontFamily: "var(--bt-font-display)" }}
            aria-label="Cari aduan"
          >
            Cari
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-dashed border-[var(--bt-tinta)]/15 bg-white/40 px-5 py-6 text-center">
          <p className="text-sm text-[var(--bt-tinta)]/50">{error}</p>
        </div>
      ) : loading ? (
        <p className="text-sm text-center py-6 text-[var(--bt-tinta)]/45">Memuat…</p>
      ) : notFound ? (
        <div className="rounded-lg border border-dashed border-[var(--bt-tinta)]/15 bg-white/40 px-5 py-6 text-center">
          <p className="text-sm text-[var(--bt-tinta)]/50">{NOT_FOUND}</p>
        </div>
      ) : row ? (
        <div className="rounded-lg border border-[var(--bt-tinta)]/10 bg-white px-4 py-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-base font-bold" style={{ fontFamily: "var(--bt-font-display)" }}>
              {row.judul}
            </p>
            <span
              className="text-xs tracking-wider shrink-0"
              style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-fascia)" }}
            >
              {row.kode_lacak}
            </span>
          </div>
          <p className="text-xs text-[var(--bt-tinta)]/50">
            {row.spbu_nama} · {formatWaktu(row.created_at)}
          </p>
          <p className="text-sm text-[var(--bt-tinta)]/80 whitespace-pre-wrap">{row.isi}</p>
          {row.foto_url ? (
            <a
              href={row.foto_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--bt-fascia)] hover:underline"
            >
              Lihat foto
            </a>
          ) : null}
          {row.jawaban ? (
            <div className="rounded-md border border-[var(--bt-fascia)]/15 bg-[var(--bt-fascia)]/5 px-3 py-3">
              <p
                className="text-[11px] uppercase tracking-wider text-[var(--bt-fascia)] mb-1"
                style={{ fontFamily: "var(--bt-font-display)" }}
              >
                Jawaban SPBU
              </p>
              <p className="text-sm whitespace-pre-wrap">{row.jawaban}</p>
              {row.dijawab_at ? (
                <p className="text-xs text-[var(--bt-tinta)]/45 mt-2">{formatWaktu(row.dijawab_at)}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--bt-tinta)]/55">Belum dijawab SPBU</p>
          )}
        </div>
      ) : !searched ? (
        <div className="rounded-lg border border-dashed border-[var(--bt-tinta)]/15 bg-white/40 px-5 py-6 text-center">
          <p className="text-xs text-[var(--bt-tinta)]/40">
            Masukkan kode 8 karakter dari bukti kirim aduan.
          </p>
        </div>
      ) : null}
    </div>
  )
}
