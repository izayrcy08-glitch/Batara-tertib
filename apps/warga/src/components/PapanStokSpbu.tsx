import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { slugFromNama } from "../lib/spbu"

type StokKondisi = "ada" | "kosong"

type Row = {
  id: string
  nama: string
  slug: string
  stok_pertalite: StokKondisi
  stok_pertamax: StokKondisi
  kondisi_diubah: string
}

function normalizeStok(v: string | null | undefined): StokKondisi {
  return v === "kosong" ? "kosong" : "ada"
}

function shortSpbuLabel(nama: string): string {
  return nama.replace(/^SPBU\s+/i, "").trim()
}

function StokCell({ value }: { value: StokKondisi }) {
  const ada = value === "ada"
  return (
    <span
      className="inline-block min-w-[4.5rem] text-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{
        fontFamily: "var(--bt-font-display)",
        background: ada ? "var(--bt-hijau)" : "var(--bt-merah-muda)",
        color: ada ? "#fff" : "#fff",
      }}
    >
      {ada ? "ada" : "kosong"}
    </span>
  )
}

function formatDiubah(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    })
  } catch {
    return ""
  }
}

/** Papan stok kompak — beranda warga, 5 SPBU */
export function PapanStokSpbu() {
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState("")
  const [latestUpdate, setLatestUpdate] = useState("")

  useEffect(() => {
    if (!supabase) {
      setError("Belum terhubung")
      return
    }
    supabase
      .from("spbu")
      .select("id, nama, stok_pertalite, stok_pertamax, kondisi_diubah")
      .eq("aktif", true)
      .order("nama")
      .then(({ data, error: err }) => {
        if (err) {
          setError("Tidak bisa memuat stok")
          return
        }
        const mapped = (data ?? []).map((s) => ({
          id: s.id,
          nama: s.nama,
          slug: slugFromNama(s.nama),
          stok_pertalite: normalizeStok(s.stok_pertalite),
          stok_pertamax: normalizeStok(s.stok_pertamax),
          kondisi_diubah: s.kondisi_diubah,
        }))
        setRows(mapped)
        const newest = mapped.reduce<string | null>((acc, r) => {
          if (!acc) return r.kondisi_diubah
          return new Date(r.kondisi_diubah).getTime() > new Date(acc).getTime() ? r.kondisi_diubah : acc
        }, null)
        setLatestUpdate(newest ?? "")
      })
  }, [])

  if (error) {
    return <p className="text-sm text-[var(--bt-tinta)]/50 mt-8">{error}</p>
  }
  if (rows.length === 0) return null

  return (
    <section
      className="mt-8 mb-2 rounded-lg border border-[var(--bt-tinta)]/10 bg-white px-3 py-3 sm:px-4"
      aria-label="Stok BBM SPBU Muara Teweh"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3
          className="text-xs font-semibold uppercase tracking-wider text-[var(--bt-fascia)]"
          style={{ fontFamily: "var(--bt-font-display)" }}
        >
          Stok BBM sekarang
        </h3>
        <span className="text-[10px] text-[var(--bt-tinta)]/45 uppercase tracking-wide">Live</span>
      </div>

      <table className="w-full text-left border-collapse table-fixed">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-[var(--bt-tinta)]/50">
            <th className="pb-1.5 font-medium w-[38%]" style={{ fontFamily: "var(--bt-font-display)" }}>
              SPBU
            </th>
            <th className="pb-1.5 font-medium text-center w-[31%]" style={{ fontFamily: "var(--bt-font-display)" }}>
              Pertalite
            </th>
            <th className="pb-1.5 font-medium text-center w-[31%]" style={{ fontFamily: "var(--bt-font-display)" }}>
              Pertamax
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[var(--bt-tinta)]/8">
              <td className="py-1.5 pr-1">
                <a
                  href={`/spbu/${r.slug}`}
                  className="text-sm font-semibold text-[var(--bt-tinta)] hover:text-[var(--bt-fascia)] transition-colors leading-tight"
                  style={{ fontFamily: "var(--bt-font-display)" }}
                >
                  {shortSpbuLabel(r.nama)}
                </a>
              </td>
              <td className="py-1.5 text-center">
                <StokCell value={r.stok_pertalite} />
              </td>
              <td className="py-1.5 text-center">
                <StokCell value={r.stok_pertamax} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {latestUpdate ? (
        <p className="text-[10px] text-[var(--bt-tinta)]/40 mt-2">
          Diperbarui petugas · {formatDiubah(latestUpdate)} WIB
        </p>
      ) : null}
    </section>
  )
}
