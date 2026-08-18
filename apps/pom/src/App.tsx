import { useState } from "react"
import { Fuel, ShieldX, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@batara/ui/components/ui/button"
import { Input } from "@batara/ui/components/ui/input"
import { Card, CardContent } from "@batara/ui/components/ui/card"

const SPBU_NAMA = "SPBU PERUSDA"

const RIWAYAT_DUMMY = Array.from({ length: 25 }, (_, i) => ({
  plat: ["KH 3455 DGF", "KH 938 EI", "KH 2201 BA", "KH 7712 CF", "KH 5590 AG"][i % 5],
  waktu: `${17 - Math.floor(i / 5)} Agu ${String(14 - (i % 12)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
  bbm: i % 3 === 1 ? "Pertamax" : "Pertalite",
  liter: [15, 20, 10, 25, 12][i % 5],
  spbu: ["PERUSDA", "JL PENDREH", "PERUSDA", "JL PRAMUKA", "JINGAH"][i % 5],
}))

const LIMIT = 20

export function App() {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? RIWAYAT_DUMMY : RIWAYAT_DUMMY.slice(0, LIMIT)
  const hasMore = RIWAYAT_DUMMY.length > LIMIT

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--bt-aspal)", color: "var(--bt-struk)" }}>
      {/* Header */}
      <header
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--bt-merah)" }}
      >
        <div>
          <h1
            className="text-lg font-bold tracking-wide uppercase text-white"
            style={{ fontFamily: "var(--bt-font-display)" }}
          >
            Batara Tertib
          </h1>
          <p className="text-xs text-white/70">{SPBU_NAMA}</p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.15)", color: "var(--bt-led)" }}
        >
          <span className="size-1.5 rounded-full bg-current animate-pulse" />
          Online
        </span>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col gap-5 px-4 py-6 max-w-md mx-auto w-full">
        {/* Input plat */}
        <section className="flex flex-col gap-2">
          <label
            htmlFor="plat"
            className="text-xs uppercase tracking-wider font-medium"
            style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.7 }}
          >
            Cari plat kendaraan
          </label>
          <Input
            id="plat"
            placeholder="CONTOH: KH 3455 DG"
            className="h-16 text-3xl tracking-widest text-center uppercase bg-transparent border-2 placeholder:opacity-30"
            style={{
              fontFamily: "var(--bt-font-display)",
              fontVariantNumeric: "tabular-nums",
              borderColor: "color-mix(in srgb, var(--bt-led) 40%, transparent)",
              color: "var(--bt-led)",
            }}
            disabled
          />
        </section>

        {/* Tombol ISI / TOLAK — besar, tebal, jempol-friendly */}
        <section className="grid grid-cols-2 gap-3">
          <button
            disabled
            className="relative h-20 rounded-2xl text-white font-black text-2xl uppercase tracking-wider flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-80"
            style={{
              fontFamily: "var(--bt-font-display)",
              background: "linear-gradient(180deg, #00C853 0%, #00873A 100%)",
              boxShadow: "0 4px 0 #005C28, 0 6px 12px rgba(0,0,0,0.4)",
            }}
          >
            <Fuel className="size-7" strokeWidth={2.5} />
            ISI
          </button>
          <button
            disabled
            className="relative h-20 rounded-2xl text-white font-black text-2xl uppercase tracking-wider flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-80"
            style={{
              fontFamily: "var(--bt-font-display)",
              background: "linear-gradient(180deg, #E53935 0%, #8B0A1E 100%)",
              boxShadow: "0 4px 0 #5C0613, 0 6px 12px rgba(0,0,0,0.4)",
            }}
          >
            <ShieldX className="size-7" strokeWidth={2.5} />
            TOLAK
          </button>
        </section>

        {/* Separator */}
        <div className="h-px w-full" style={{ background: "color-mix(in srgb, var(--bt-led) 12%, transparent)" }} />

        {/* Riwayat */}
        <section className="flex flex-col gap-2.5">
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.6 }}
          >
            Riwayat pengisian hari ini
          </h2>
          {visible.map((r, i) => (
            <Card key={i} className="border-0 shadow-none rounded-lg" style={{ background: "#242424" }}>
              <CardContent className="flex items-center justify-between px-4 py-3">
                <div>
                  <p
                    className="text-base font-bold tracking-wider text-white"
                    style={{ fontFamily: "var(--bt-font-display)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {r.plat}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {r.waktu} · {r.spbu}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p
                    className="text-sm font-bold"
                    style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)" }}
                  >
                    {r.liter} L
                  </p>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded"
                    style={{
                      background: r.bbm === "Pertamax"
                        ? "color-mix(in srgb, var(--bt-biru) 20%, transparent)"
                        : "color-mix(in srgb, var(--bt-hijau) 20%, transparent)",
                      color: r.bbm === "Pertamax" ? "var(--bt-biru)" : "var(--bt-hijau)",
                    }}
                  >
                    {r.bbm}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      {/* Tombol expand/collapse — sticky di bawah, selalu terlihat */}
      {hasMore && (
        <div
          className="sticky bottom-0 z-10 px-4 pb-3 pt-2"
          style={{ background: "linear-gradient(to top, var(--bt-aspal) 60%, transparent)" }}
        >
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full max-w-md mx-auto flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
            style={{
              fontFamily: "var(--bt-font-display)",
              background: "#2a2a2a",
              color: "var(--bt-led)",
              border: "1px solid rgba(240,211,94,0.15)",
            }}
          >
            {expanded ? (
              <>
                <ChevronUp className="size-4" />
                Lihat lebih sedikit
              </>
            ) : (
              <>
                <ChevronDown className="size-4" />
                Lihat lebih banyak
              </>
            )}
          </button>
        </div>
      )}

      <footer className="px-4 py-2 text-center text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
        Batara Tertib v0 · Muara Teweh
      </footer>
    </div>
  )
}
