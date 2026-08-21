import { useEffect, useState } from "react"
import { compressImageToWebp, CompressImageError } from "@batara/ui/lib/compress-image"
import { supabase } from "../lib/supabase"

type Spbu = { id: string; nama: string }

const FAIL = "Tidak bisa mengirim. Coba lagi."

export function FormAduan() {
  const [spbuList, setSpbuList] = useState<Spbu[]>([])
  const [spbuId, setSpbuId] = useState("")
  const [judul, setJudul] = useState("")
  const [isi, setIsi] = useState("")
  const [foto, setFoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [kodeLacak, setKodeLacak] = useState<string | null>(null)
  const [loadSpbuError, setLoadSpbuError] = useState("")

  useEffect(() => {
    if (!supabase) {
      setLoadSpbuError("Laporan belum terhubung ke server")
      return
    }
    void supabase
      .from("spbu")
      .select("id, nama")
      .eq("aktif", true)
      .order("nama")
      .then(({ data, error: err }) => {
        if (err) {
          setLoadSpbuError(FAIL)
          return
        }
        setSpbuList((data as Spbu[]) ?? [])
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!supabase) {
      setError("Laporan belum terhubung ke server")
      return
    }
    if (!spbuId) {
      setError("Pilih SPBU dulu")
      return
    }
    const j = judul.trim()
    const body = isi.trim()
    if (j.length < 3) {
      setError("Judul terlalu pendek")
      return
    }
    if (body.length < 5) {
      setError("Jelaskan masalah lebih jelas")
      return
    }

    setLoading(true)
    let fotoPath: string | null = null
    let fotoUrl: string | null = null

    try {
      if (foto) {
        const { blob, fileName } = await compressImageToWebp(foto)
        fotoPath = `aduan/${fileName}`
        const { error: upErr } = await supabase.storage
          .from("aduan")
          .upload(fotoPath, blob, { upsert: false, contentType: "image/webp" })
        if (upErr) {
          setError("Foto gagal diunggah. Coba tanpa foto atau pilih ulang.")
          setLoading(false)
          return
        }
        fotoUrl = supabase.storage.from("aduan").getPublicUrl(fotoPath).data.publicUrl
      }

      const { data, error: rpcErr } = await supabase.rpc("kirim_aduan", {
        p_spbu_id: spbuId,
        p_judul: j,
        p_isi: body,
        p_foto_path: fotoPath,
        p_foto_url: fotoUrl,
      })

      if (rpcErr || !data) {
        setError(FAIL)
        setLoading(false)
        return
      }

      setKodeLacak(String(data))
      setJudul("")
      setIsi("")
      setFoto(null)
      setSpbuId("")
    } catch (err) {
      setError(err instanceof CompressImageError ? err.message : FAIL)
    }
    setLoading(false)
  }

  if (kodeLacak) {
    return (
      <div
        className="rounded-lg border border-[var(--bt-fascia)]/20 bg-white p-5 flex flex-col gap-3"
      >
        <p className="text-sm font-medium text-[var(--bt-fascia)]">Aduan terkirim</p>
        <p className="text-sm text-[var(--bt-tinta)]/70">
          Simpan kode lacak ini. Pakai untuk menanyakan status ke SPBU.
        </p>
        <p
          className="text-3xl font-bold tracking-[0.2em] text-center py-3"
          style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-fascia)" }}
        >
          {kodeLacak}
        </p>
        <button
          type="button"
          onClick={() => setKodeLacak(null)}
          className="h-11 rounded-lg text-sm font-bold uppercase tracking-wide text-[var(--bt-struk)]"
          style={{ background: "var(--bt-fascia)", fontFamily: "var(--bt-font-display)" }}
        >
          Kirim aduan lain
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {loadSpbuError ? (
        <p className="text-sm text-[var(--bt-merah)]">{loadSpbuError}</p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="spbu" className="text-sm font-medium">
          SPBU yang diadukan
        </label>
        <select
          id="spbu"
          required
          value={spbuId}
          onChange={(e) => setSpbuId(e.target.value)}
          className="h-10 w-full rounded-md border border-[var(--bt-tinta)]/15 bg-white px-3 text-sm outline-none focus:border-[var(--bt-fascia)] focus:ring-2 focus:ring-[var(--bt-fascia)]/20"
        >
          <option value="" disabled>
            Pilih SPBU
          </option>
          {spbuList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="judul" className="text-sm font-medium">
          Judul aduan
        </label>
        <input
          id="judul"
          type="text"
          required
          maxLength={120}
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          placeholder="Contoh: Antrian lama, stok Pertalite kosong"
          className="h-10 w-full rounded-md border border-[var(--bt-tinta)]/15 bg-white px-3 text-sm outline-none focus:border-[var(--bt-fascia)] focus:ring-2 focus:ring-[var(--bt-fascia)]/20 placeholder:text-[var(--bt-tinta)]/35"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="masalah" className="text-sm font-medium">
          Jelaskan masalah
        </label>
        <textarea
          id="masalah"
          required
          maxLength={2000}
          rows={4}
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          placeholder="Ceritakan kronologi atau keluhan Anda"
          className="w-full rounded-md border border-[var(--bt-tinta)]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--bt-fascia)] focus:ring-2 focus:ring-[var(--bt-fascia)]/20 placeholder:text-[var(--bt-tinta)]/35 resize-y"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bukti" className="text-sm font-medium">
          Bukti pendukung <span className="font-normal text-[var(--bt-tinta)]/45">(opsional)</span>
        </label>
        <input
          id="bukti"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--bt-fascia)]/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--bt-fascia)] file:cursor-pointer hover:file:bg-[var(--bt-fascia)]/20"
        />
        <p className="text-xs text-[var(--bt-tinta)]/45">
          Foto dikompres otomatis (WebP). Maks sumber 5 MB.
        </p>
        {foto ? <p className="text-xs text-[var(--bt-tinta)]/60">Terpilih: {foto.name}</p> : null}
      </div>

      {error ? <p className="text-sm text-[var(--bt-merah)]">{error}</p> : null}

      <button
        type="submit"
        disabled={loading || !!loadSpbuError}
        className="h-12 w-full rounded-lg font-bold text-sm tracking-wide uppercase text-[var(--bt-struk)] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: "var(--bt-fascia)", fontFamily: "var(--bt-font-display)" }}
      >
        {loading ? "Mengirim…" : "Kirim Aduan"}
      </button>
      <p className="text-xs text-center text-[var(--bt-tinta)]/40">
        Laporan tercatat anonim. Setelah SPBU menjawab, data dihapus otomatis H+7.
      </p>
    </form>
  )
}
