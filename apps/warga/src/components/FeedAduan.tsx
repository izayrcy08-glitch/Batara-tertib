import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

type AduanItem = {
  judul: string
  isi: string
  foto_url: string | null
  spbu_nama: string
  jawaban: string | null
  dijawab_at: string | null
  created_at: string
}

type RpcOk = { status: "ok"; items: AduanItem[] }

const LOAD_FAIL = "Tidak bisa memuat. Coba lagi."
const EMPTY = "Belum ada aduan 7 hari terakhir."

function formatWaktu(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  })
}

export function FeedAduan() {
  const [items, setItems] = useState<AduanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!supabase) {
      setError("Belum terhubung ke server")
      setLoading(false)
      return
    }

    void supabase.rpc("daftar_aduan_publik").then(({ data, error: rpcErr }) => {
      setLoading(false)
      if (rpcErr) {
        setError(LOAD_FAIL)
        return
      }
      const result = data as RpcOk | null
      if (!result || result.status !== "ok" || !Array.isArray(result.items)) {
        setError(LOAD_FAIL)
        return
      }
      setItems(result.items)
    })
  }, [])

  if (loading) {
    return <p className="text-sm text-center py-6 text-[var(--bt-tinta)]/45">Memuat…</p>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--bt-tinta)]/15 bg-white/40 px-5 py-6 text-center">
        <p className="text-sm text-[var(--bt-tinta)]/50">{error}</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--bt-tinta)]/15 bg-white/40 px-5 py-6 text-center">
        <p className="text-sm text-[var(--bt-tinta)]/50">{EMPTY}</p>
        <a href="/aduan" className="inline-block mt-3 text-sm text-[var(--bt-fascia)] hover:underline">
          Kirim aduan
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((row) => (
        <article
          key={`${row.spbu_nama}-${row.created_at}-${row.judul}`}
          className="rounded-lg border border-[var(--bt-tinta)]/10 bg-white px-4 py-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-base font-bold" style={{ fontFamily: "var(--bt-font-display)" }}>
              {row.judul}
            </p>
            <span
              className="text-[11px] uppercase tracking-wider shrink-0 px-2 py-0.5 rounded"
              style={{
                fontFamily: "var(--bt-font-display)",
                backgroundColor: row.jawaban ? "var(--bt-fascia)" : "var(--bt-tinta)",
                color: "var(--bt-struk)",
                opacity: row.jawaban ? 1 : 0.45,
              }}
            >
              {row.jawaban ? "Dijawab" : "Menunggu"}
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
        </article>
      ))}
    </div>
  )
}
