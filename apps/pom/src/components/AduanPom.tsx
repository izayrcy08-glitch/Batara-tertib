import { useCallback, useEffect, useState } from "react"
import { Button } from "@batara/ui/components/ui/button"
import { Textarea } from "@batara/ui/components/ui/textarea"
import { Label } from "@batara/ui/components/ui/label"
import { toast } from "sonner"
import { supabase } from "../lib/supabase"

export type AduanRow = {
  id: string
  kode_lacak: string
  judul: string
  isi: string
  foto_url: string | null
  jawaban: string | null
  dijawab_at: string | null
  created_at: string
}

type Props = {
  spbuId: string
  userId: string
  onClose: () => void
}

export function AduanPom({ spbuId, userId, onClose }: Props) {
  const [rows, setRows] = useState<AduanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [jawabId, setJawabId] = useState<string | null>(null)
  const [jawaban, setJawaban] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("aduan")
      .select("id, kode_lacak, judul, isi, foto_url, jawaban, dijawab_at, created_at")
      .eq("spbu_id", spbuId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      toast.error("Gagal memuat aduan. Coba lagi.")
      setRows([])
    } else {
      setRows((data as AduanRow[]) ?? [])
    }
    setLoading(false)
  }, [spbuId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleJawab(id: string) {
    const text = jawaban.trim()
    if (text.length < 2) {
      toast.error("Isi jawaban dulu")
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from("aduan")
      .update({
        jawaban: text,
        dijawab_at: new Date().toISOString(),
        dijawab_oleh: userId,
      })
      .eq("id", id)

    setSaving(false)
    if (error) {
      toast.error("Gagal menyimpan jawaban. Coba lagi.")
      return
    }
    toast.success("Jawaban terkirim")
    setJawabId(null)
    setJawaban("")
    await load()
  }

  const open = rows.filter((r) => !r.dijawab_at)
  const done = rows.filter((r) => r.dijawab_at)

  return (
    <section
      className="flex flex-col gap-3 rounded-xl p-3"
      style={{ background: "#232323", border: "1px solid rgba(240,211,94,0.16)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-xs uppercase tracking-wider"
          style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.75 }}
        >
          Aduan SPBU
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs uppercase tracking-wider px-2 py-1"
          style={{ fontFamily: "var(--bt-font-display)", color: "rgba(255,255,255,0.55)" }}
        >
          Tutup
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-white/40 py-4 text-center">Memuat…</p>
      ) : open.length === 0 && done.length === 0 ? (
        <p className="text-sm text-white/40 py-4 text-center">Belum ada aduan</p>
      ) : (
        <>
          {open.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p
                className="text-[10px] uppercase tracking-wider"
                style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-merah-muda)" }}
              >
                Belum dijawab ({open.length})
              </p>
              {open.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg p-3 flex flex-col gap-2"
                  style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-bold text-white" style={{ fontFamily: "var(--bt-font-display)" }}>
                      {r.judul}
                    </p>
                    <span className="text-[10px] tracking-wider text-white/40 shrink-0">{r.kode_lacak}</span>
                  </div>
                  <p className="text-xs text-white/65 whitespace-pre-wrap">{r.isi}</p>
                  {r.foto_url ? (
                    <a
                      href={r.foto_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs"
                      style={{ color: "var(--bt-hijau)" }}
                    >
                      Lihat foto
                    </a>
                  ) : null}
                  <p className="text-[10px] text-white/35">
                    {new Date(r.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
                  </p>

                  {jawabId === r.id ? (
                    <div className="flex flex-col gap-2 mt-1">
                      <Label
                        htmlFor={`jawab-${r.id}`}
                        className="text-xs uppercase tracking-wider"
                        style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.65 }}
                      >
                        Jawaban
                      </Label>
                      <Textarea
                        id={`jawab-${r.id}`}
                        value={jawaban}
                        onChange={(e) => setJawaban(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="Tanggapan SPBU"
                        className="bg-transparent border text-white text-sm"
                        style={{ borderColor: "color-mix(in srgb, var(--bt-led) 30%, transparent)" }}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleJawab(r.id)}
                          className="flex-1 h-10 font-bold uppercase tracking-wider"
                          style={{
                            fontFamily: "var(--bt-font-display)",
                            background: "var(--bt-hijau)",
                            color: "#0a0a0a",
                          }}
                        >
                          {saving ? "…" : "Kirim jawaban"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={saving}
                          onClick={() => {
                            setJawabId(null)
                            setJawaban("")
                          }}
                          className="h-10"
                          style={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.2)" }}
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => {
                        setJawabId(r.id)
                        setJawaban("")
                      }}
                      className="h-10 w-full font-bold uppercase tracking-wider"
                      style={{
                        fontFamily: "var(--bt-font-display)",
                        background: "var(--bt-led)",
                        color: "#161814",
                      }}
                    >
                      Jawab
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40 text-center py-2">Tidak ada aduan menunggu</p>
          )}

          {done.length > 0 ? (
            <div className="flex flex-col gap-2 mt-2">
              <p
                className="text-[10px] uppercase tracking-wider"
                style={{ fontFamily: "var(--bt-font-display)", color: "rgba(255,255,255,0.4)" }}
              >
                Sudah dijawab ({done.length})
              </p>
              {done.slice(0, 10).map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg p-3 flex flex-col gap-1"
                  style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex justify-between gap-2">
                    <p className="text-sm text-white/80" style={{ fontFamily: "var(--bt-font-display)" }}>
                      {r.judul}
                    </p>
                    <span className="text-[10px] text-white/35">{r.kode_lacak}</span>
                  </div>
                  <p className="text-xs text-white/50">{r.jawaban}</p>
                  <p className="text-[10px] text-white/30">
                    Dihapus otomatis H+7 setelah jawab ·{" "}
                    {r.dijawab_at
                      ? new Date(r.dijawab_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
