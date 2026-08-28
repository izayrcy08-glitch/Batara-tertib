import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { slugFromNama } from "../lib/spbu"

type StokKondisi = "ada" | "kosong"
type AntrianKondisi = "sepi" | "sedang" | "ramai"

type SpbuKondisi = {
  id: string
  nama: string
  slug: string
  stok_pertalite: StokKondisi
  stok_pertamax: StokKondisi
  antrian: AntrianKondisi
  kondisi_diubah: string
}

const ANTRIAN_LABEL: Record<AntrianKondisi, string> = {
  sepi: "Sepi",
  sedang: "Sedang",
  ramai: "Ramai",
}

function stokTone(v: StokKondisi): string {
  return v === "ada" ? "var(--bt-pertalite)" : "var(--bt-tolak)"
}

function antrianTone(v: AntrianKondisi): string {
  if (v === "sepi") return "var(--bt-pertalite)"
  if (v === "sedang") return "var(--bt-led)"
  return "var(--bt-tolak)"
}

export function StokAntrianBadges({
  stok_pertalite,
  stok_pertamax,
  antrian,
  compact,
}: Pick<SpbuKondisi, "stok_pertalite" | "stok_pertamax" | "antrian"> & { compact?: boolean }) {
  const size = compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "mt-1.5" : "mt-2"}`}>
      <Badge label={`Pertalite ${stok_pertalite === "ada" ? "ada" : "kosong"}`} color={stokTone(stok_pertalite)} size={size} />
      <Badge label={`Pertamax ${stok_pertamax === "ada" ? "ada" : "kosong"}`} color={stokTone(stok_pertamax)} size={size} />
      <Badge label={`Antrian ${ANTRIAN_LABEL[antrian].toLowerCase()}`} color={antrianTone(antrian)} size={size} />
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
      .select("id, nama, stok_pertalite, stok_pertamax, antrian, kondisi_diubah")
      .eq("id", spbuId)
      .eq("aktif", true)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) {
          setError("Tidak bisa memuat kondisi")
          return
        }
        if (!data) return
        setRow({
          id: data.id,
          nama: data.nama,
          slug: slugFromNama(data.nama),
          stok_pertalite: data.stok_pertalite as StokKondisi,
          stok_pertamax: data.stok_pertamax as StokKondisi,
          antrian: data.antrian as AntrianKondisi,
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
      aria-label="Stok dan antrian SPBU"
    >
      <h3
        className="text-sm font-semibold uppercase tracking-wider text-[var(--bt-fascia)] mb-2"
        style={{ fontFamily: "var(--bt-font-display)" }}
      >
        Stok & antrian sekarang
      </h3>
      <StokAntrianBadges {...row} />
      <p className="text-xs text-[var(--bt-tinta)]/45 mt-2">
        Diperbarui petugas · {formatDiubah(row.kondisi_diubah)} WIB
      </p>
    </section>
  )
}

/** Semua SPBU — beranda */
export function SpbuListStokAntrian() {
  const [rows, setRows] = useState<SpbuKondisi[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    if (!supabase) {
      setError("Belum terhubung")
      return
    }
    supabase
      .from("spbu")
      .select("id, nama, stok_pertalite, stok_pertamax, antrian, kondisi_diubah")
      .eq("aktif", true)
      .order("nama")
      .then(({ data, error: err }) => {
        if (err) {
          setError("Tidak bisa memuat kondisi SPBU")
          return
        }
        setRows(
          (data ?? []).map((s) => ({
            id: s.id,
            nama: s.nama,
            slug: slugFromNama(s.nama),
            stok_pertalite: s.stok_pertalite as StokKondisi,
            stok_pertamax: s.stok_pertamax as StokKondisi,
            antrian: s.antrian as AntrianKondisi,
            kondisi_diubah: s.kondisi_diubah,
          })),
        )
      })
  }, [])

  if (error) {
    return <p className="text-sm text-[var(--bt-tinta)]/50">{error}</p>
  }
  if (rows.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {rows.map((s) => (
        <a
          key={s.id}
          href={`/spbu/${s.slug}`}
          className="rounded-lg border border-[var(--bt-tinta)]/10 bg-white px-4 py-3 hover:border-[var(--bt-fascia)]/30 transition-colors"
        >
          <p className="text-base font-bold" style={{ fontFamily: "var(--bt-font-display)" }}>
            {s.nama}
          </p>
          <StokAntrianBadges {...s} compact />
        </a>
      ))}
    </div>
  )
}
