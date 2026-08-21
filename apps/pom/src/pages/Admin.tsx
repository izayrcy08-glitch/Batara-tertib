import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@batara/ui/components/ui/button"
import { Card, CardContent } from "@batara/ui/components/ui/card"
import { Input } from "@batara/ui/components/ui/input"
import { Label } from "@batara/ui/components/ui/label"
import { toast } from "sonner"
import { supabase } from "../lib/supabase"
import {
  PAGE,
  LAPORAN_LOAD_FAIL,
  addDaysWib,
  angkaPlat,
  invokeAdminUsers,
  loadKendaraan,
  loadPetugas,
  loadRekap,
  loadRiwayat,
  loadSpbu,
  todayWib,
  compactPlat,
  type Kendaraan,
  type Petugas,
  type ProdukFilter,
  type RekapRow,
  type Riwayat,
  type Spbu,
} from "../lib/adminApi"

type AdminView = "petugas" | "spbu" | "kendaraan" | "riwayat" | "laporan"

const NAV: { id: AdminView; label: string }[] = [
  { id: "petugas", label: "Petugas" },
  { id: "spbu", label: "SPBU" },
  { id: "kendaraan", label: "Plat" },
  { id: "riwayat", label: "Riwayat" },
  { id: "laporan", label: "Laporan" },
]

const inputStyle: CSSProperties = {
  borderColor: "color-mix(in srgb, var(--bt-led) 30%, transparent)",
  color: "var(--bt-led)",
  fontFamily: "var(--bt-font-display)",
}

const LAPORAN_KOSONG = "Belum ada pengisian di rentang ini"

function fail(err: unknown, fallback: string) {
  const msg = err instanceof Error ? err.message : fallback
  toast.error(msg)
}

export function AdminPanel({ profile, onSignOut }: { profile: { nama: string }; onSignOut: () => void }) {
  const [spbu, setSpbu] = useState<Spbu[]>([])
  const [bootError, setBootError] = useState("")
  const [booting, setBooting] = useState(true)
  const [view, setView] = useState<AdminView>("petugas")

  const reloadSpbu = useCallback(async () => {
    const rows = await loadSpbu()
    setSpbu(rows)
  }, [])

  useEffect(() => {
    reloadSpbu()
      .catch((err) => setBootError(err instanceof Error ? err.message : "Gagal memuat SPBU"))
      .finally(() => setBooting(false))
  }, [reloadSpbu])

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--bt-aspal)", color: "var(--bt-struk)" }}>
      <header style={{ background: "var(--bt-merah)" }}>
        <div className="max-w-md mx-auto w-full px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-wide uppercase text-white" style={{ fontFamily: "var(--bt-font-display)" }}>
              Batara Tertib
            </h1>
            <p className="text-xs text-white/70">Admin · {profile.nama}</p>
          </div>
          <button type="button" onClick={onSignOut} className="p-2 rounded-lg" style={{ color: "rgba(255,255,255,0.7)" }} title="Keluar">
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full overflow-y-auto">
        <div className="max-w-md mx-auto w-full px-4 pt-3 pb-20">
          {booting ? (
            <p className="text-sm text-center py-10 text-white/50">Memuat…</p>
          ) : bootError ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--bt-merah-muda)" }}>{bootError}</p>
          ) : view === "petugas" ? (
            <TabPetugas spbu={spbu} />
          ) : view === "spbu" ? (
            <TabSpbu spbu={spbu} onChange={reloadSpbu} />
          ) : view === "kendaraan" ? (
            <TabKendaraan />
          ) : view === "riwayat" ? (
            <TabRiwayat spbu={spbu} />
          ) : (
            <TabLaporan spbu={spbu} />
          )}
        </div>
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-20 border-t"
        style={{ background: "var(--bt-aspal)", borderColor: "rgba(240,211,94,0.25)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-md mx-auto w-full grid grid-cols-5">
          {NAV.map((item) => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className="h-14 text-[11px] uppercase tracking-wide"
                style={{
                  fontFamily: "var(--bt-font-display)",
                  color: active ? "var(--bt-led)" : "rgba(255,255,255,0.45)",
                  borderTop: active ? "2px solid var(--bt-led)" : "2px solid transparent",
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-3 max-h-[90dvh] overflow-y-auto"
        style={{ background: "#1E1E1E", border: "1px solid rgba(240,211,94,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold uppercase tracking-wider text-white" style={{ fontFamily: "var(--bt-font-display)" }}>
          {title}
        </h3>
        {children}
      </div>
    </div>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className="text-xs uppercase tracking-wider" style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.7 }}>
      {children}
    </Label>
  )
}

function StrukCard({ children }: { children: ReactNode }) {
  return (
    <Card
      className="border-0 shadow-none rounded-lg py-0 gap-0"
      style={{ background: "var(--bt-struk)", color: "var(--bt-tinta)", padding: 0 }}
    >
      <CardContent className="flex flex-col gap-1 px-4 py-3" style={{ padding: "12px 16px" }}>
        {children}
      </CardContent>
    </Card>
  )
}

function ActionRow({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1 mt-2 pt-2"
      style={{ borderTop: "1px solid color-mix(in srgb, var(--bt-tinta) 12%, transparent)" }}
    >
      {children}
    </div>
  )
}

function TextAction({
  children,
  onClick,
  tone = "ink",
}: {
  children: ReactNode
  onClick: () => void
  tone?: "ink" | "ok" | "warn"
}) {
  const color = tone === "warn" ? "var(--bt-merah)" : tone === "ok" ? "var(--bt-hijau)" : "var(--bt-tinta)"
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold uppercase tracking-wider"
      style={{ color, fontFamily: "var(--bt-font-display)" }}
    >
      {children}
    </button>
  )
}

function StatusLine({ aktif }: { aktif: boolean }) {
  return (
    <p
      className="text-[11px] uppercase mt-1"
      style={{ color: aktif ? "var(--bt-hijau)" : "var(--bt-merah)", fontFamily: "var(--bt-font-display)" }}
    >
      {aktif ? "Aktif" : "Nonaktif"}
    </p>
  )
}

function TabPetugas({ spbu }: { spbu: Spbu[] }) {
  const [petugas, setPetugas] = useState<Petugas[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState<"tambah" | "edit" | "sandi" | null>(null)
  const [edit, setEdit] = useState<Petugas | null>(null)
  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [spbuId, setSpbuId] = useState(spbu[0]?.id ?? "")
  const [password, setPassword] = useState("")
  const [aktif, setAktif] = useState(true)

  const reload = useCallback(async () => {
    setPetugas(await loadPetugas())
  }, [])

  useEffect(() => {
    reload()
      .catch((err) => fail(err, "Gagal memuat petugas"))
      .finally(() => setLoading(false))
  }, [reload])

  function openTambah() {
    setNama("")
    setEmail("")
    setSpbuId(spbu[0]?.id ?? "")
    setPassword("")
    setAktif(true)
    setEdit(null)
    setOpen("tambah")
  }

  function openEdit(p: Petugas) {
    setEdit(p)
    setNama(p.nama)
    setEmail(p.email)
    setSpbuId(p.spbu_id)
    setAktif(p.aktif)
    setOpen("edit")
  }

  async function simpanTambah() {
    setSaving(true)
    try {
      await invokeAdminUsers({ action: "create", nama, email, password, spbu_id: spbuId })
      toast.success("Petugas ditambah")
      setOpen(null)
      await reload()
    } catch (err) {
      fail(err, "Gagal menambah petugas")
    } finally {
      setSaving(false)
    }
  }

  async function simpanEdit() {
    if (!edit) return
    setSaving(true)
    try {
      await invokeAdminUsers({ action: "update", id: edit.id, nama, email, spbu_id: spbuId, aktif })
      toast.success("Petugas disimpan")
      setOpen(null)
      await reload()
    } catch (err) {
      fail(err, "Gagal menyimpan petugas")
    } finally {
      setSaving(false)
    }
  }

  async function hapus(p: Petugas) {
    if (!confirm(p.aktif ? `Nonaktifkan ${p.nama}?` : `Hapus permanen ${p.nama}?`)) return
    try {
      const result = await invokeAdminUsers({ action: "delete", id: p.id })
      toast.success(result.deactivated ? "Petugas dinonaktifkan" : "Petugas dihapus")
      await reload()
    } catch (err) {
      fail(err, "Gagal menghapus petugas")
    }
  }

  async function aktifkan(p: Petugas) {
    try {
      await invokeAdminUsers({ action: "update", id: p.id, nama: p.nama, email: p.email, spbu_id: p.spbu_id, aktif: true })
      toast.success("Petugas diaktifkan")
      await reload()
    } catch (err) {
      fail(err, "Gagal mengaktifkan petugas")
    }
  }

  async function simpanSandi() {
    if (!edit) return
    setSaving(true)
    try {
      await invokeAdminUsers({ action: "reset_password", id: edit.id, password })
      toast.success("Sandi diganti")
      setOpen(null)
    } catch (err) {
      fail(err, "Gagal mengganti sandi")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={openTambah}
        className="self-start text-xs font-bold uppercase tracking-wider"
        style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)" }}
      >
        + Tambah petugas
      </button>
      {loading ? (
        <p className="text-sm text-center py-8 text-white/40">Memuat…</p>
      ) : petugas.length === 0 ? (
        <p className="text-sm text-center py-8 text-white/40">Belum ada petugas</p>
      ) : (
        petugas.map((p) => (
          <StrukCard key={p.id}>
            <p className="font-medium leading-snug">{p.nama}</p>
            <p className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--bt-tinta) 55%, transparent)" }}>
              {spbu.find((s) => s.id === p.spbu_id)?.nama ?? "-"}
            </p>
            {p.email ? (
              <p className="text-xs" style={{ color: "color-mix(in srgb, var(--bt-tinta) 40%, transparent)" }}>{p.email}</p>
            ) : null}
            <StatusLine aktif={p.aktif} />
            <ActionRow>
              <TextAction onClick={() => openEdit(p)}>Edit</TextAction>
              <TextAction onClick={() => { setEdit(p); setPassword(""); setOpen("sandi") }}>Sandi</TextAction>
              {!p.aktif && <TextAction tone="ok" onClick={() => void aktifkan(p)}>Aktifkan</TextAction>}
              <TextAction tone="warn" onClick={() => void hapus(p)}>{p.aktif ? "Nonaktifkan" : "Hapus"}</TextAction>
            </ActionRow>
          </StrukCard>
        ))
      )}

      {(open === "tambah" || open === "edit") && (
        <Sheet title={open === "tambah" ? "Tambah petugas" : "Edit petugas"} onClose={() => setOpen(null)}>
          <FieldLabel htmlFor="p-nama">Nama</FieldLabel>
          <Input id="p-nama" value={nama} onChange={(e) => setNama(e.target.value)} className="h-12 bg-transparent border-2" style={inputStyle} />
          <FieldLabel htmlFor="p-email">Email</FieldLabel>
          <Input id="p-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-transparent border-2" style={inputStyle} />
          <FieldLabel htmlFor="p-spbu">SPBU</FieldLabel>
          <select id="p-spbu" value={spbuId} onChange={(e) => setSpbuId(e.target.value)} className="h-12 px-3 rounded-md border-2 bg-transparent text-sm" style={inputStyle}>
            {spbu.map((s) => (
              <option key={s.id} value={s.id} style={{ color: "#111", background: "#fff" }}>{s.nama}</option>
            ))}
          </select>
          {open === "edit" && (
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
              Aktif
            </label>
          )}
          {open === "tambah" && (
            <>
              <FieldLabel htmlFor="p-pass">Sandi awal</FieldLabel>
              <Input id="p-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-transparent border-2" style={inputStyle} />
            </>
          )}
          <Button type="button" disabled={saving} onClick={open === "tambah" ? () => void simpanTambah() : () => void simpanEdit()} className="h-12 font-bold uppercase tracking-wider text-white" style={{ fontFamily: "var(--bt-font-display)", background: "var(--bt-biru)" }}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
          <button type="button" onClick={() => setOpen(null)} className="h-10 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Batal</button>
        </Sheet>
      )}

      {open === "sandi" && edit && (
        <Sheet title={`Reset sandi · ${edit.nama}`} onClose={() => setOpen(null)}>
          <FieldLabel htmlFor="p-newpass">Sandi baru</FieldLabel>
          <Input id="p-newpass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-transparent border-2" style={inputStyle} />
          <Button type="button" disabled={saving} onClick={() => void simpanSandi()} className="h-12 font-bold uppercase tracking-wider text-white" style={{ fontFamily: "var(--bt-font-display)", background: "var(--bt-merah)" }}>
            {saving ? "Menyimpan…" : "Simpan sandi"}
          </Button>
        </Sheet>
      )}
    </section>
  )
}

function TabSpbu({ spbu, onChange }: { spbu: Spbu[]; onChange: () => Promise<void> }) {
  const [open, setOpen] = useState<"tambah" | "edit" | null>(null)
  const [edit, setEdit] = useState<Spbu | null>(null)
  const [nama, setNama] = useState("")
  const [saving, setSaving] = useState(false)

  async function simpanTambah() {
    if (!nama.trim()) {
      toast.error("Isi nama SPBU")
      return
    }
    setSaving(true)
    const { error } = await supabase.from("spbu").insert({ nama: nama.trim().toUpperCase(), aktif: true })
    setSaving(false)
    if (error) {
      fail(error, "Gagal menambah SPBU")
      return
    }
    toast.success("SPBU ditambah")
    setOpen(null)
    setNama("")
    await onChange()
  }

  async function simpanEdit() {
    if (!edit) return
    if (!nama.trim()) {
      toast.error("Isi nama SPBU")
      return
    }
    setSaving(true)
    const { error } = await supabase.from("spbu").update({ nama: nama.trim().toUpperCase() }).eq("id", edit.id)
    setSaving(false)
    if (error) {
      fail(error, "Gagal menyimpan SPBU")
      return
    }
    toast.success("Nama SPBU disimpan")
    setOpen(null)
    await onChange()
  }

  async function toggleAktif(s: Spbu) {
    const { error } = await supabase.from("spbu").update({ aktif: !s.aktif }).eq("id", s.id)
    if (error) {
      fail(error, "Gagal mengubah status SPBU")
      return
    }
    toast.success(s.aktif ? "SPBU dinonaktifkan" : "SPBU diaktifkan")
    await onChange()
  }

  return (
    <section className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => { setNama(""); setEdit(null); setOpen("tambah") }}
        className="self-start text-xs font-bold uppercase tracking-wider"
        style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)" }}
      >
        + Tambah SPBU
      </button>
      {spbu.length === 0 ? (
        <p className="text-sm text-center py-8 text-white/40">Belum ada SPBU</p>
      ) : (
        spbu.map((s) => (
          <StrukCard key={s.id}>
            <p className="font-medium leading-snug">{s.nama}</p>
            <StatusLine aktif={s.aktif} />
            <ActionRow>
              <TextAction onClick={() => { setEdit(s); setNama(s.nama); setOpen("edit") }}>Edit</TextAction>
              <TextAction tone={s.aktif ? "warn" : "ok"} onClick={() => void toggleAktif(s)}>
                {s.aktif ? "Nonaktifkan" : "Aktifkan"}
              </TextAction>
            </ActionRow>
          </StrukCard>
        ))
      )}
      {open && (
        <Sheet title={open === "tambah" ? "Tambah SPBU" : "Edit SPBU"} onClose={() => setOpen(null)}>
          <FieldLabel htmlFor="s-nama">Nama</FieldLabel>
          <Input id="s-nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="SPBU ..." className="h-12 bg-transparent border-2 uppercase" style={inputStyle} />
          <Button type="button" disabled={saving} onClick={open === "tambah" ? () => void simpanTambah() : () => void simpanEdit()} className="h-12 font-bold uppercase tracking-wider text-white" style={{ fontFamily: "var(--bt-font-display)", background: "var(--bt-biru)" }}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </Sheet>
      )}
    </section>
  )
}

function TabKendaraan() {
  const [q, setQ] = useState("")
  const [qApplied, setQApplied] = useState("")
  const [rows, setRows] = useState<Kendaraan[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [edit, setEdit] = useState<Kendaraan | null>(null)
  const [plat, setPlat] = useState("")
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async (search: string, start: number, append = false) => {
    const data = await loadKendaraan(search, start)
    setRows((prev) => (append ? [...prev, ...data] : data))
    setOffset(start + data.length)
    return data.length
  }, [])

  useEffect(() => {
    reload("", 0)
      .catch((err) => fail(err, "Gagal memuat kendaraan"))
      .finally(() => setLoading(false))
  }, [reload])

  async function cari() {
    setLoading(true)
    setQApplied(q)
    try {
      await reload(q, 0)
    } catch (err) {
      fail(err, "Gagal mencari")
    } finally {
      setLoading(false)
    }
  }

  async function simpan() {
    if (!edit) return
    const p = plat.trim().toUpperCase()
    if (p.length < 4) {
      toast.error("Plat tidak valid")
      return
    }
    setSaving(true)
    const { error } = await supabase.from("kendaraan").update({ plat_lengkap: p, angka_plat: angkaPlat(p) }).eq("id", edit.id)
    setSaving(false)
    if (error) {
      fail(error, "Gagal menyimpan plat")
      return
    }
    toast.success("Plat disimpan")
    setEdit(null)
    await reload(qApplied, 0)
  }

  async function hapus(k: Kendaraan) {
    const [{ count: trx }, { count: tolak }] = await Promise.all([
      supabase.from("transaksi").select("id", { count: "exact", head: true }).eq("kendaraan_id", k.id),
      supabase.from("tolakan").select("id", { count: "exact", head: true }).eq("kendaraan_id", k.id),
    ])
    if ((trx ?? 0) + (tolak ?? 0) > 0) {
      toast.error("Ada riwayat. Hapus riwayat dulu")
      return
    }
    if (!confirm(`Hapus ${k.plat_lengkap}?`)) return
    const { error } = await supabase.from("kendaraan").delete().eq("id", k.id)
    if (error) {
      fail(error, "Gagal menghapus kendaraan")
      return
    }
    toast.success("Kendaraan dihapus")
    await reload(qApplied, 0)
  }

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void cari()}
          placeholder="Cari plat atau angka"
          className="h-12 bg-transparent border-2 uppercase"
          style={inputStyle}
        />
        <Button type="button" onClick={() => void cari()} className="h-12 font-bold uppercase tracking-wider text-white" style={{ fontFamily: "var(--bt-font-display)", background: "var(--bt-biru)" }}>
          Cari
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-center py-8 text-white/40">Memuat…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-center py-8 text-white/40">Tidak ada kendaraan</p>
      ) : (
        rows.map((k) => (
          <StrukCard key={k.id}>
            <p className="font-bold tracking-wider" style={{ fontFamily: "var(--bt-font-display)", fontVariantNumeric: "tabular-nums" }}>{k.plat_lengkap}</p>
            {k.foto_url ? (
              <a href={k.foto_url} target="_blank" rel="noreferrer" className="text-xs mt-0.5 inline-block" style={{ color: "var(--bt-hijau)" }}>Lihat foto</a>
            ) : null}
            <ActionRow>
              <TextAction onClick={() => { setEdit(k); setPlat(k.plat_lengkap) }}>Edit</TextAction>
              <TextAction tone="warn" onClick={() => void hapus(k)}>Hapus</TextAction>
            </ActionRow>
          </StrukCard>
        ))
      )}
      {!loading && rows.length >= PAGE && rows.length === offset && (
        <Button type="button" onClick={() => void reload(qApplied, offset, true)} className="h-12 text-xs uppercase tracking-wider" style={{ fontFamily: "var(--bt-font-display)", background: "#242424", color: "var(--bt-led)" }}>
          Muat lagi
        </Button>
      )}
      {edit && (
        <Sheet title="Edit kendaraan" onClose={() => setEdit(null)}>
          <FieldLabel htmlFor="k-plat">Plat lengkap</FieldLabel>
          <Input id="k-plat" value={plat} onChange={(e) => setPlat(e.target.value.toUpperCase())} className="h-12 bg-transparent border-2" style={inputStyle} />
          <Button type="button" disabled={saving} onClick={() => void simpan()} className="h-12 font-bold uppercase tracking-wider text-white" style={{ fontFamily: "var(--bt-font-display)", background: "var(--bt-biru)" }}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </Sheet>
      )}
    </section>
  )
}

function TabRiwayat({ spbu }: { spbu: Spbu[] }) {
  const [from, setFrom] = useState(addDaysWib(todayWib(), -6))
  const [to, setTo] = useState(todayWib())
  const [spbuId, setSpbuId] = useState<"semua" | string>("semua")
  const [plat, setPlat] = useState("")
  const [rows, setRows] = useState<Riwayat[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Riwayat | null>(null)
  const [liter, setLiter] = useState("")
  const [produk, setProduk] = useState<"Pertalite" | "Pertamax">("Pertalite")
  const [catatan, setCatatan] = useState("")
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await loadRiwayat({ from, to, spbuId, plat: "" }))
    } catch (err) {
      fail(err, "Gagal memuat riwayat")
    } finally {
      setLoading(false)
    }
  }, [from, to, spbuId])

  useEffect(() => {
    void reload()
  }, [reload])

  async function simpan() {
    if (!edit) return
    setSaving(true)
    if (edit.sumber === "transaksi") {
      const n = parseInt(liter, 10)
      if (!n || n <= 0) {
        setSaving(false)
        toast.error("Liter harus angka lebih dari 0")
        return
      }
      const { error } = await supabase.from("transaksi").update({ liter: n, produk }).eq("id", edit.id)
      setSaving(false)
      if (error) {
        fail(error, "Gagal menyimpan pengisian")
        return
      }
    } else {
      const { error } = await supabase.from("tolakan").update({ catatan: catatan.trim() || null }).eq("id", edit.id)
      setSaving(false)
      if (error) {
        fail(error, "Gagal menyimpan tolakan")
        return
      }
    }
    toast.success("Riwayat disimpan")
    setEdit(null)
    await reload()
  }

  async function hapus(r: Riwayat) {
    if (!confirm("Hapus catatan ini?")) return
    const table = r.sumber === "transaksi" ? "transaksi" : "tolakan"
    const { error } = await supabase.from(table).delete().eq("id", r.id)
    if (error) {
      fail(error, "Gagal menghapus")
      return
    }
    toast.success("Catatan dihapus")
    await reload()
  }

  const visible = plat.trim()
    ? rows.filter((r) => {
        const n = compactPlat(plat)
        return compactPlat(r.plat).includes(n) || r.plat.replace(/[^0-9]/g, "").includes(n.replace(/[^0-9]/g, ""))
      })
    : rows

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="r-from">Dari</FieldLabel>
          <Input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-12 bg-transparent border-2" style={inputStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="r-to">Sampai</FieldLabel>
          <Input id="r-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-12 bg-transparent border-2" style={inputStyle} />
        </div>
        <select value={spbuId} onChange={(e) => setSpbuId(e.target.value)} className="h-12 px-3 rounded-md border-2 bg-transparent text-sm" style={inputStyle}>
          <option value="semua" style={{ color: "#111", background: "#fff" }}>Semua SPBU</option>
          {spbu.map((s) => (
            <option key={s.id} value={s.id} style={{ color: "#111", background: "#fff" }}>{s.nama}</option>
          ))}
        </select>
        <Input value={plat} onChange={(e) => setPlat(e.target.value)} placeholder="Cari plat" className="h-12 bg-transparent border-2 uppercase" style={inputStyle} />
      </div>
      {loading ? (
        <p className="text-sm text-center py-8 text-white/40">Memuat…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-center py-8 text-white/40">Belum ada riwayat</p>
      ) : (
        visible.map((r) => (
          <StrukCard key={`${r.sumber}-${r.id}`}>
            <p className="font-bold tracking-wider" style={{ fontFamily: "var(--bt-font-display)", fontVariantNumeric: "tabular-nums" }}>{r.plat}</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: r.sumber === "tolakan" ? "var(--bt-merah)" : "var(--bt-hijau)", fontFamily: "var(--bt-font-display)" }}>
              {r.sumber === "tolakan" ? `TOLAK · ${r.catatan ?? ""}` : `${r.liter} L ${r.produk}`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--bt-tinta) 50%, transparent)" }}>
              {new Date(r.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              {" · "}{r.spbu_nama}
            </p>
            <ActionRow>
              <TextAction
                onClick={() => {
                  setEdit(r)
                  setLiter(r.liter != null ? String(r.liter) : "")
                  setProduk(r.produk === "Pertamax" ? "Pertamax" : "Pertalite")
                  setCatatan(r.catatan ?? "")
                }}
              >
                Edit
              </TextAction>
              <TextAction tone="warn" onClick={() => void hapus(r)}>Hapus</TextAction>
            </ActionRow>
          </StrukCard>
        ))
      )}
      {edit && (
        <Sheet title={edit.sumber === "transaksi" ? "Edit pengisian" : "Edit tolakan"} onClose={() => setEdit(null)}>
          <p className="text-sm text-white/60">{edit.plat}</p>
          {edit.sumber === "transaksi" ? (
            <>
              <FieldLabel htmlFor="r-liter">Liter</FieldLabel>
              <Input id="r-liter" inputMode="numeric" value={liter} onChange={(e) => setLiter(e.target.value.replace(/[^\d]/g, ""))} className="h-12 bg-transparent border-2" style={inputStyle} />
              <FieldLabel htmlFor="r-produk">Produk</FieldLabel>
              <select id="r-produk" value={produk} onChange={(e) => setProduk(e.target.value as "Pertalite" | "Pertamax")} className="h-12 px-3 rounded-md border-2 bg-transparent" style={inputStyle}>
                <option value="Pertalite" style={{ color: "#111" }}>Pertalite</option>
                <option value="Pertamax" style={{ color: "#111" }}>Pertamax</option>
              </select>
            </>
          ) : (
            <>
              <FieldLabel htmlFor="r-catatan">Alasan</FieldLabel>
              <Input id="r-catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} className="h-12 bg-transparent border-2" style={inputStyle} />
            </>
          )}
          <Button type="button" disabled={saving} onClick={() => void simpan()} className="h-12 font-bold uppercase tracking-wider text-white" style={{ fontFamily: "var(--bt-font-display)", background: "var(--bt-biru)" }}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </Sheet>
      )}
    </section>
  )
}

function TabLaporan({ spbu }: { spbu: Spbu[] }) {
  const [from, setFrom] = useState(addDaysWib(todayWib(), -6))
  const [to, setTo] = useState(todayWib())
  const [spbuId, setSpbuId] = useState<"semua" | string>("semua")
  const [produk, setProduk] = useState<ProdukFilter>("semua")
  const [rows, setRows] = useState<RekapRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    setLoading(true)
    setLoadError("")
    loadRekap(from, to, spbuId, produk)
      .then((data) => {
        setRows(data)
        setLoadError("")
      })
      .catch(() => {
        setRows([])
        setLoadError(LAPORAN_LOAD_FAIL)
      })
      .finally(() => setLoading(false))
  }, [from, to, spbuId, produk])

  const totalLite = useMemo(() => rows.reduce((s, r) => s + r.pertalite, 0), [rows])
  const totalMax = useMemo(() => rows.reduce((s, r) => s + r.pertamax, 0), [rows])

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="l-from">Dari</FieldLabel>
          <Input id="l-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-12 bg-transparent border-2" style={inputStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="l-to">Sampai</FieldLabel>
          <Input id="l-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-12 bg-transparent border-2" style={inputStyle} />
        </div>
        <select value={spbuId} onChange={(e) => setSpbuId(e.target.value)} className="h-12 px-3 rounded-md border-2 bg-transparent text-sm" style={inputStyle}>
          <option value="semua" style={{ color: "#111", background: "#fff" }}>Semua SPBU</option>
          {spbu.map((s) => (
            <option key={s.id} value={s.id} style={{ color: "#111", background: "#fff" }}>{s.nama}</option>
          ))}
        </select>
        <select value={produk} onChange={(e) => setProduk(e.target.value as ProdukFilter)} className="h-12 px-3 rounded-md border-2 bg-transparent text-sm" style={inputStyle}>
          <option value="semua" style={{ color: "#111", background: "#fff" }}>Pertalite & Pertamax</option>
          <option value="Pertalite" style={{ color: "#111", background: "#fff" }}>Pertalite</option>
          <option value="Pertamax" style={{ color: "#111", background: "#fff" }}>Pertamax</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-center py-8 text-white/40">Memuat…</p>
      ) : loadError ? (
        <p className="text-sm text-center py-8 text-white/40">{loadError}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-center py-8 text-white/40">{LAPORAN_KOSONG}</p>
      ) : (
        <>
          <div className={produk === "semua" ? "grid grid-cols-2 gap-2.5" : "flex flex-col gap-2.5"}>
            {(produk === "semua" || produk === "Pertalite") && (
              <StrukCard>
                <p className="text-[11px] uppercase tracking-wider" style={{ fontFamily: "var(--bt-font-display)", color: "color-mix(in srgb, var(--bt-tinta) 45%, transparent)" }}>Pertalite</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-hijau)", fontVariantNumeric: "tabular-nums" }}>{totalLite} L</p>
              </StrukCard>
            )}
            {(produk === "semua" || produk === "Pertamax") && (
              <StrukCard>
                <p className="text-[11px] uppercase tracking-wider" style={{ fontFamily: "var(--bt-font-display)", color: "color-mix(in srgb, var(--bt-tinta) 45%, transparent)" }}>Pertamax</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-biru)", fontVariantNumeric: "tabular-nums" }}>{totalMax} L</p>
              </StrukCard>
            )}
          </div>
          {rows.map((r) => (
            <StrukCard key={r.spbu_id}>
              <p className="text-sm font-semibold">{r.spbu_nama}</p>
              <p className="text-xs mt-0.5" style={{ color: "color-mix(in srgb, var(--bt-tinta) 55%, transparent)" }}>
                {produk !== "Pertamax" ? `Pertalite ${r.pertalite} L` : null}
                {produk === "semua" ? " · " : null}
                {produk !== "Pertalite" ? `Pertamax ${r.pertamax} L` : null}
              </p>
            </StrukCard>
          ))}
        </>
      )}
    </section>
  )
}
