import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { requireSupabase } from "../lib/supabase"

type StokKondisi = "ada" | "kosong"
type AntrianKondisi = "sepi" | "sedang" | "ramai"

type Kondisi = {
  stok_pertalite: StokKondisi
  stok_pertamax: StokKondisi
  antrian: AntrianKondisi
}

const STOK_OPTS: { value: StokKondisi; label: string }[] = [
  { value: "ada", label: "Ada" },
  { value: "kosong", label: "Kosong" },
]

const ANTRIAN_OPTS: { value: AntrianKondisi; label: string }[] = [
  { value: "sepi", label: "Sepi" },
  { value: "sedang", label: "Sedang" },
  { value: "ramai", label: "Ramai" },
]

type Props = {
  spbuId: string
}

export function KondisiSpbu({ spbuId }: Props) {
  const supabase = requireSupabase()
  const [kondisi, setKondisi] = useState<Kondisi | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      const { data, error } = await supabase
        .from("spbu")
        .select("stok_pertalite, stok_pertamax, antrian")
        .eq("id", spbuId)
        .single()
      if (cancelled) return
      if (error || !data) {
        setKondisi(null)
        setLoading(false)
        return
      }
      setKondisi({
        stok_pertalite: data.stok_pertalite as StokKondisi,
        stok_pertamax: data.stok_pertamax as StokKondisi,
        antrian: data.antrian as AntrianKondisi,
      })
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [spbuId, supabase])

  async function save(next: Kondisi) {
    setSaving(true)
    const { error } = await supabase.rpc("set_kondisi_spbu", {
      p_stok_pertalite: next.stok_pertalite,
      p_stok_pertamax: next.stok_pertamax,
      p_antrian: next.antrian,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message.includes("set_kondisi_spbu") ? "Fitur stok belum aktif di server" : error.message)
      return
    }
    setKondisi(next)
    toast.success("Kondisi SPBU disimpan")
  }

  if (loading) {
    return (
      <div
        className="px-4 py-2 flex items-center justify-center gap-2 text-xs"
        style={{ background: "var(--bt-fascia)", color: "rgba(255,255,255,0.7)" }}
      >
        <Loader2 className="size-3.5 animate-spin" />
        Memuat kondisi…
      </div>
    )
  }

  if (!kondisi) return null

  return (
    <div
      className="px-4 py-3 flex flex-col gap-2 border-b"
      style={{
        background: "var(--bt-fascia)",
        borderColor: "color-mix(in srgb, var(--bt-led) 20%, transparent)",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.85 }}
      >
        Stok & antrian · lapangan
      </p>

      <Row label="Pertalite">
        <ToggleGroup
          options={STOK_OPTS}
          value={kondisi.stok_pertalite}
          disabled={saving}
          onChange={(v) => void save({ ...kondisi, stok_pertalite: v as StokKondisi })}
        />
      </Row>
      <Row label="Pertamax">
        <ToggleGroup
          options={STOK_OPTS}
          value={kondisi.stok_pertamax}
          disabled={saving}
          onChange={(v) => void save({ ...kondisi, stok_pertamax: v as StokKondisi })}
        />
      </Row>
      <Row label="Antrian">
        <ToggleGroup
          options={ANTRIAN_OPTS}
          value={kondisi.antrian}
          disabled={saving}
          onChange={(v) => void save({ ...kondisi, antrian: v as AntrianKondisi })}
        />
      </Row>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-white/75 shrink-0 w-16">{label}</span>
      {children}
    </div>
  )
}

function ToggleGroup<T extends string>({
  options,
  value,
  disabled,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  disabled?: boolean
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-1 gap-1 justify-end flex-wrap">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide disabled:opacity-50"
            style={{
              fontFamily: "var(--bt-font-display)",
              background: active ? "var(--bt-led)" : "rgba(255,255,255,0.1)",
              color: active ? "var(--bt-aspal)" : "rgba(255,255,255,0.85)",
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
