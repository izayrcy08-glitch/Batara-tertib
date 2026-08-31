import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { slugFromNama } from "../lib/spbu"

type StokKondisi = "ada" | "kosong"

type SpbuKondisi = {
  id: string
  nama: string
  slug: string
  stok_pertalite: StokKondisi
  stok_pertamax: StokKondisi
  kondisi_diubah: string
}

function stokTone(v: StokKondisi): string {
  return v === "ada" ? "var(--bt-hijau)" : "var(--bt-merah-muda)"
}

export function StokAntrianBadges({
  stok_pertalite,
  stok_pertamax,
  compact,
}: Pick<SpbuKondisi, "stok_pertalite" | "stok_pertamax"> & { compact?: boolean }) {
  const size = compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "mt-1.5" : "mt-2"}`}>
      <Badge label={`Pertalite ${stok_pertalite === "ada" ? "ada" : "kosong"}`} color={stokTone(stok_pertalite)} size={size} />
      <Badge label={`Pertamax ${stok_pertamax === "ada" ? "ada" : "kosong"}`} color={stokTone(stok_pertamax)} size={size} />
    </div>
  )
}

function Badge({ label, color, size }: { label: string; color: string; size: string }) {
  return (
    <span
      className={`inline-flex rounded font-semibold uppercase tracking-wide text-white ${size}`}
      style={{ fontFamily: "var(--bt-font-display)", background: color }}
    >
      {label}
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

/** Satu SPBU — halaman detail */
export function StokAntrianPanel({ spbuId }: { spbuId: string }) {
  const [row, setRow] = useState<SpbuKondisi | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!supabase) {
      setError("Belum terhubung")
      return
    }
    supabase
      .from("spbu")
      .select("id, nama, stok_pertalite, stok_pertamax, kondisi_diubah")
      .eq("id", spbuId)
      .eq("aktif", true)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) {
          setError("Tidak bisa memuat stok")
          return
        }
        if (!data) return
        setRow({
          id: data.id,
          nama: data.nama,
          slug: slugFromNama(data.nama),
          stok_pertalite: data.stok_pertalite as StokKondisi,
          stok_pertamax: data.stok_pertamax as StokKondisi,
          kondisi_diubah: data.kondisi_diubah,
        })
      })
  }, [spbuId])

  if (error) {
    return <p className="text-sm text-[var(--bt-tinta)]/50">{error}</p>
  }
  if (!row) return null

  return (
    <section
      className="rounded-lg border border-[var(--bt-tinta)]/10 bg-white px-4 py-4 mb-6"
      aria-label="Stok SPBU"
    >
      <h3
        className="text-sm font-semibold uppercase tracking-wider text-[var(--bt-fascia)] mb-2"
        style={{ fontFamily: "var(--bt-font-display)" }}
      >
        Stok sekarang
      </h3>
      <StokAntrianBadges {...row} />
      <p className="text-xs text-[var(--bt-tinta)]/45 mt-2">
        Diperbarui petugas · {formatDiubah(row.kondisi_diubah)} WIB
      </p>
    </section>
  )
}
