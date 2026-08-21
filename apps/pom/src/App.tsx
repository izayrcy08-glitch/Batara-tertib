import { useState, useEffect, useRef } from "react"
import { Fuel, ShieldX, LogOut, Search, Loader2, Plus, MessageSquareWarning } from "lucide-react"
import { Button } from "@batara/ui/components/ui/button"
import { Input } from "@batara/ui/components/ui/input"
import { Label } from "@batara/ui/components/ui/label"
import { Textarea } from "@batara/ui/components/ui/textarea"
import { Card, CardContent } from "@batara/ui/components/ui/card"
import { Toaster, toast } from "sonner"
import { useAuth } from "./hooks/useAuth"
import { Login } from "./pages/Login"
import { AdminPanel } from "./pages/Admin"
import { AduanPom } from "./components/AduanPom"
import { supabase } from "./lib/supabase"
import { labelAlasanTolak } from "./lib/tolak"
import { compressImageToWebp, CompressImageError } from "@batara/ui/lib/compress-image"

type Kendaraan = {
  id: string
  plat_lengkap: string
  angka_plat: string
}

type Riwayat = {
  id: string
  plat_lengkap: string
  waktu: string
  created_at: string
  bbm: string
  liter: number | null
  spbu_nama: string
  jenis: "isi" | "tolak"
  catatan?: string | null
}

type AlasanTolakCode = "isi_ulang_hari_ini" | "stnk_tidak_cocok" | "lainnya"
type ResultSummary = {
  statusText: string
  statusTone: "ok" | "warn"
  lastText: string
  lastTone: "ok" | "warn"
  spbuNama: string
}

function wibDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" })
}

function namaRelasiSpbu(rel: { nama?: string } | { nama?: string }[] | null | undefined): string {
  if (!rel) return ""
  if (Array.isArray(rel)) return rel[0]?.nama?.trim() ?? ""
  return rel.nama?.trim() ?? ""
}

function compactPlat(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

function platCocokCari(stored: string, queryRaw: string): boolean {
  const a = compactPlat(stored)
  const b = compactPlat(queryRaw)
  if (!b) return false
  return a === b || a.startsWith(b)
}

function normalizePlat(input: string): string | null {
  const raw = input.toUpperCase().replace(/\s+/g, " ").trim()
  if (!raw) return null

  // Accept compact form: KH3455DGF -> KH 3455 DGF
  const compact = raw.replace(/\s+/g, "")
  const compactMatch = compact.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{1,3})$/)
  if (compactMatch) {
    return `${compactMatch[1]} ${compactMatch[2]} ${compactMatch[3]}`
  }

  // Accept spaced form: KH 3455 DGF
  const spacedMatch = raw.match(/^([A-Z]{1,2})\s(\d{1,4})\s([A-Z]{1,3})$/)
  if (spacedMatch) {
    return `${spacedMatch[1]} ${spacedMatch[2]} ${spacedMatch[3]}`
  }

  return null
}

export function App() {
  const { session, profile, loading: authLoading, signIn, signOut } = useAuth()

  if (authLoading) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ background: "var(--bt-aspal)" }}
      >
        <Loader2 className="size-8 animate-spin" style={{ color: "var(--bt-led)" }} />
      </div>
    )
  }

  if (!session || !profile) {
    return <Login onLogin={signIn} />
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      {profile.role === "admin" ? (
        <AdminPanel profile={profile} onSignOut={signOut} />
      ) : (
        <Dashboard profile={profile} userId={session.user.id} onSignOut={signOut} />
      )}
    </>
  )
}

function Dashboard({ profile, userId, onSignOut }: {
  profile: { nama: string; role: string; spbu_id: string | null }
  userId: string
  onSignOut: () => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Kendaraan[]>([])
  const [resultSummary, setResultSummary] = useState<Record<string, ResultSummary>>({})
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Kendaraan | null>(null)
  const [showAksiPanel, setShowAksiPanel] = useState(false)
  const [riwayat, setRiwayat] = useState<Riwayat[]>([])
  const [riwayatLoading, setRiwayatLoading] = useState(false)
  const [riwayatSpbuHariIni, setRiwayatSpbuHariIni] = useState<Riwayat[]>([])
  const [riwayatSpbuLoading, setRiwayatSpbuLoading] = useState(false)
  const [riwayatSpbuExpanded, setRiwayatSpbuExpanded] = useState(false)
  const [spbuNama, setSpbuNama] = useState("")
  const [liter, setLiter] = useState("")
  const [produk, setProduk] = useState("Pertalite")
  const [isiLoading, setIsiLoading] = useState(false)
  const [tolakOpen, setTolakOpen] = useState(false)
  const [tolakLoading, setTolakLoading] = useState(false)
  const [manualAlasan, setManualAlasan] = useState("")
  const [showManualAlasan, setShowManualAlasan] = useState(false)
  const [daftarPlat, setDaftarPlat] = useState("")
  const [showDaftarForm, setShowDaftarForm] = useState(false)
  const [fotoKendaraan, setFotoKendaraan] = useState<File | null>(null)
  const [daftarLoading, setDaftarLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [showAduan, setShowAduan] = useState(false)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const PRODUK_BBM = ["Pertalite", "Pertamax"] as const
  const ALASAN_TOLAK: { value: AlasanTolakCode; label: string; catatan?: string; manual?: boolean }[] = [
    { value: "isi_ulang_hari_ini", label: "Sudah isi hari ini" },
    { value: "stnk_tidak_cocok", label: "STNK tidak cocok" },
    { value: "lainnya", label: "Tidak ada plat", catatan: "tidak_ada_plat" },
    { value: "lainnya", label: "Tidak ada STNK", catatan: "tidak_ada_stnk" },
    { value: "lainnya", label: "Lainnya", manual: true },
  ]

  useEffect(() => {
    if (profile.spbu_id) {
      supabase
        .from("spbu")
        .select("nama")
        .eq("id", profile.spbu_id)
        .single()
        .then(({ data }) => {
          if (data) setSpbuNama(data.nama)
        })
      void loadRiwayatSpbuHariIni(profile.spbu_id)
    }
  }, [profile.spbu_id])

  async function loadRiwayatSpbuHariIni(spbuId: string) {
    setRiwayatSpbuLoading(true)
    const nowIso = new Date().toISOString()
    const todayWib = wibDateKey(nowIso)
    const dayStartApprox = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()

    const [transaksiRes, tolakanRes] = await Promise.all([
      supabase
        .from("transaksi")
        .select("id, liter, produk, created_at, kendaraan:kendaraan_id(plat_lengkap), spbu:spbu_id(nama)")
        .eq("spbu_id", spbuId)
        .gte("created_at", dayStartApprox)
        .limit(80),
      supabase
        .from("tolakan")
        .select("id, alasan, catatan, created_at, kendaraan:kendaraan_id(plat_lengkap), spbu:spbu_id(nama)")
        .eq("spbu_id", spbuId)
        .gte("created_at", dayStartApprox)
        .limit(80),
    ])

    const trxMapped: Riwayat[] = (transaksiRes.data ?? [])
      .filter((t: any) => wibDateKey(t.created_at) === todayWib)
      .map((t: any) => ({
        id: `spbu-trx-${t.id}`,
        plat_lengkap: t.kendaraan?.plat_lengkap ?? "-",
        waktu: new Date(t.created_at).toLocaleString("id-ID", {
          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
        }),
        created_at: t.created_at,
        bbm: t.produk,
        liter: t.liter,
        spbu_nama: t.spbu?.nama ?? "-",
        jenis: "isi",
        catatan: null,
      }))

    const tolMapped: Riwayat[] = (tolakanRes.data ?? [])
      .filter((t: any) => wibDateKey(t.created_at) === todayWib)
      .map((t: any) => ({
        id: `spbu-tol-${t.id}`,
        plat_lengkap: t.kendaraan?.plat_lengkap ?? "-",
        waktu: new Date(t.created_at).toLocaleString("id-ID", {
          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
        }),
        created_at: t.created_at,
        bbm: "TOLAK",
        liter: null,
        spbu_nama: t.spbu?.nama ?? "-",
        jenis: "tolak",
        catatan: labelAlasanTolak(t.alasan, t.catatan),
      }))

    const mapped = [...trxMapped, ...tolMapped].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    setRiwayatSpbuHariIni(mapped)
    setRiwayatSpbuLoading(false)
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Browser ini tidak mendukung kamera langsung")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
    } catch {
      toast.error("Izin kamera ditolak. Izinkan kamera di browser, lalu coba lagi.")
    }
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) {
      toast.error("Kamera belum siap")
      return
    }
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Gagal mengambil foto")
        return
      }
      const file = new File([blob], `kendaraan-${Date.now()}.jpg`, { type: "image/jpeg" })
      setFotoKendaraan(file)
      stopCamera()
    }, "image/jpeg", 0.85)
  }

  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) return
    videoRef.current.srcObject = streamRef.current
    void videoRef.current.play()
  }, [cameraOpen])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    setSelected(null)
    setShowAksiPanel(false)

    const raw = query.trim().toUpperCase()
    const normalized = normalizePlat(raw)
    const compactQuery = compactPlat(raw)
    const digitsOnly = /^[0-9]+$/.test(compactQuery)
    const angka = compactQuery.replace(/[^0-9]/g, "")

    let data: Kendaraan[] | null = null
    let error: { message: string } | null = null

    if (digitsOnly) {
      const res = await supabase
        .from("kendaraan")
        .select("id, plat_lengkap, angka_plat")
        .eq("angka_plat", compactQuery)
        .limit(10)
      data = res.data
      error = res.error
    } else if (angka) {
      const res = await supabase
        .from("kendaraan")
        .select("id, plat_lengkap, angka_plat")
        .eq("angka_plat", angka)
        .limit(20)
      data = res.data
      error = res.error
    } else {
      const safe = compactQuery.replace(/[%_]/g, "")
      const res = await supabase
        .from("kendaraan")
        .select("id, plat_lengkap, angka_plat")
        .ilike("plat_lengkap", `%${safe}%`)
        .limit(10)
      data = res.data
      error = res.error
    }

    if (error) {
      toast.error("Gagal mencari. Coba lagi.")
      setResultSummary({})
    } else {
      let list = data ?? []
      if (!digitsOnly) {
        list = list.filter(
          (k) =>
            platCocokCari(k.plat_lengkap, raw) ||
            (normalized ? platCocokCari(k.plat_lengkap, normalized) : false),
        )
      }
      setResults(list)
      if (list.length === 0) {
        toast("Plat tidak ditemukan. Daftar baru di bawah.")
        setDaftarPlat(normalized ?? raw)
        setShowDaftarForm(true)
        setResultSummary({})
      } else {
        setDaftarPlat("")
        setFotoKendaraan(null)
        setShowDaftarForm(false)
        await hydrateResultSummary(list)
      }
    }
    setSearching(false)
  }

  async function hydrateResultSummary(list: Kendaraan[]) {
    const summaries = await Promise.all(
      list.map(async (k) => {
        const [trxRes, tolakRes] = await Promise.all([
          supabase
            .from("transaksi")
            .select("created_at, liter, produk, spbu:spbu_id(nama)")
            .eq("kendaraan_id", k.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("tolakan")
            .select("created_at, alasan, catatan, spbu:spbu_id(nama)")
            .eq("kendaraan_id", k.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])

        const trx = trxRes.data as
          | { created_at: string; liter: number; produk: string; spbu?: { nama?: string } | { nama?: string }[] | null }
          | null
        const tol = tolakRes.data as
          | { created_at: string; alasan: string; catatan: string | null; spbu?: { nama?: string } | { nama?: string }[] | null }
          | null
        const lastIsTolak = !!tol && (!trx || new Date(tol.created_at).getTime() > new Date(trx.created_at).getTime())
        const lastTime = lastIsTolak ? tol?.created_at : trx?.created_at
        const spbuNama = lastIsTolak ? namaRelasiSpbu(tol?.spbu) : namaRelasiSpbu(trx?.spbu)

        const alreadyFilledToday = !!trx && wibDateKey(trx.created_at) === wibDateKey(new Date().toISOString())

        let lastText = "Belum ada riwayat"
        if (lastTime && lastIsTolak && tol) {
          lastText = `Terakhir: TOLAK (${labelAlasanTolak(tol.alasan, tol.catatan)}) · ${new Date(lastTime).toLocaleString("id-ID", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}`
        } else if (lastTime && trx) {
          lastText = alreadyFilledToday
            ? `Sudah isi hari ini · ${trx.liter}L ${trx.produk} · ${new Date(trx.created_at).toLocaleString("id-ID", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })}`
            : `Terakhir: ISI ${trx.liter}L ${trx.produk} · ${new Date(lastTime).toLocaleString("id-ID", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })}`
        }

        const summary: ResultSummary = {
          statusText: alreadyFilledToday ? "Sudah isi hari ini" : "Sudah terdaftar",
          statusTone: alreadyFilledToday ? "warn" : "ok",
          lastText,
          lastTone: alreadyFilledToday ? "warn" : "ok",
          spbuNama,
        }

        return [k.id, summary] as const
      }),
    )

    setResultSummary((prev) => ({ ...prev, ...Object.fromEntries(summaries) }))
  }

  async function loadRiwayat(k: Kendaraan) {
    setRiwayatLoading(true)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [transaksiRes, tolakanRes] = await Promise.all([
      supabase
        .from("transaksi")
        .select("id, liter, produk, created_at, spbu:spbu_id(nama)")
        .eq("kendaraan_id", k.id)
        .gte("created_at", sevenDaysAgo.toISOString())
        .limit(20),
      supabase
        .from("tolakan")
        .select("id, alasan, catatan, created_at, spbu:spbu_id(nama)")
        .eq("kendaraan_id", k.id)
        .gte("created_at", sevenDaysAgo.toISOString())
        .limit(20),
    ])

    const transaksiMapped: Riwayat[] = (transaksiRes.data ?? []).map((t: any) => ({
      id: `trx-${t.id}`,
      plat_lengkap: k.plat_lengkap,
      created_at: t.created_at,
      waktu: new Date(t.created_at).toLocaleString("id-ID", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      }),
      bbm: t.produk,
      liter: t.liter,
      spbu_nama: t.spbu?.nama ?? "-",
      jenis: "isi",
      catatan: null,
    }))

    const tolakanMapped: Riwayat[] = (tolakanRes.data ?? []).map((t: any) => ({
      id: `tol-${t.id}`,
      plat_lengkap: k.plat_lengkap,
      created_at: t.created_at,
      waktu: new Date(t.created_at).toLocaleString("id-ID", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      }),
      bbm: "TOLAK",
      liter: null,
      spbu_nama: t.spbu?.nama ?? "-",
      jenis: "tolak",
      catatan: labelAlasanTolak(t.alasan, t.catatan),
    }))

    const mapped = [...transaksiMapped, ...tolakanMapped].sort(
      (a, b) => {
        const aTime = new Date(a.created_at).getTime()
        const bTime = new Date(b.created_at).getTime()
        return bTime - aTime
      },
    )

    setRiwayat(mapped)
    setRiwayatLoading(false)
  }

  async function handleSelect(k: Kendaraan) {
    setSelected(k)
    setShowAksiPanel(true)
    setLiter("")
    await loadRiwayat(k)
  }

  async function handleIsi(kendaraanId: string) {
    const literNum = parseInt(liter, 10)
    if (!liter || Number.isNaN(literNum) || literNum <= 0) {
      toast.error("Isi liter dulu. Harus angka lebih dari 0")
      return
    }
    if (!PRODUK_BBM.includes(produk as (typeof PRODUK_BBM)[number])) {
      toast.error("Pilih produk BBM")
      return
    }

    setIsiLoading(true)
    const { error } = await supabase.from("transaksi").insert({
      kendaraan_id: kendaraanId,
      spbu_id: profile.spbu_id,
      user_id: userId,
      liter: literNum,
      produk,
    })
    setIsiLoading(false)

    if (error) {
      if (error.message.includes("idx_satu_isi_per_hari")) {
        toast.error("Sudah isi hari ini! 1 plat = 1 isi per hari.")
      } else {
        toast.error("Gagal menyimpan. Coba lagi.")
      }
    } else {
      toast.success(`ISI ${literNum} L ${produk} berhasil`)
      setLiter("")
      if (profile.spbu_id) await loadRiwayatSpbuHariIni(profile.spbu_id)
      if (selected) {
        await loadRiwayat(selected)
        await hydrateResultSummary([selected])
      }
      setShowAksiPanel(false)
    }
  }

  async function handleTolak(
    kendaraanId: string,
    alasanPilih: AlasanTolakCode,
    catatan?: string,
  ) {
    setTolakLoading(true)
    const { error } = await supabase.from("tolakan").insert({
      kendaraan_id: kendaraanId,
      spbu_id: profile.spbu_id,
      user_id: userId,
      alasan: alasanPilih,
      catatan: catatan ?? null,
    })
    setTolakLoading(false)

    if (error) {
      toast.error("Gagal mencatat tolakan. Coba lagi.")
    } else {
      toast.success("Tolakan dicatat")
      if (profile.spbu_id) await loadRiwayatSpbuHariIni(profile.spbu_id)
      if (selected) {
        await loadRiwayat(selected)
        await hydrateResultSummary([selected])
      }
      setShowAksiPanel(false)
      setTolakOpen(false)
      setShowManualAlasan(false)
      setManualAlasan("")
    }
  }

  function openDaftarBaru() {
    const raw = query.trim().toUpperCase()
    setDaftarPlat(normalizePlat(raw) ?? raw)
    setShowDaftarForm(true)
  }

  async function handleDaftarBaru() {
    const normalized = normalizePlat(daftarPlat)
    if (!normalized) {
      toast.error("Plat tidak valid. Contoh: KH 3455 DGF")
      return
    }

    setDaftarLoading(true)
    const angka = normalized.replace(/[^0-9]/g, "")
    let fotoUrl: string | null = null

    if (fotoKendaraan) {
      try {
        const { blob, fileName } = await compressImageToWebp(fotoKendaraan)
        const filePath = `kendaraan/${fileName}`
        const { error: uploadError } = await supabase.storage
          .from("kendaraan")
          .upload(filePath, blob, { upsert: false, contentType: "image/webp" })

        if (!uploadError) {
          const { data: publicData } = supabase.storage.from("kendaraan").getPublicUrl(filePath)
          fotoUrl = publicData.publicUrl
        } else {
          toast("Foto tidak tersimpan, data kendaraan tetap didaftarkan.")
        }
      } catch (err) {
        const msg =
          err instanceof CompressImageError ? err.message : "Foto tidak tersimpan, data kendaraan tetap didaftarkan."
        toast(msg)
      }
    }

    const { data, error } = await supabase
      .from("kendaraan")
      .insert({ plat_lengkap: normalized, angka_plat: angka, foto_url: fotoUrl })
      .select()
      .single()
    setDaftarLoading(false)

    if (error) {
      if (error.message.includes("duplicate")) {
        toast.error("Plat sudah terdaftar")
      } else {
        toast.error("Gagal mendaftar. Coba lagi.")
      }
    } else {
      toast.success("Kendaraan terdaftar: " + normalized)
      const kendaraanBaru = data as Kendaraan
      setResults([kendaraanBaru])
      setQuery(normalized)
      setDaftarPlat("")
      setFotoKendaraan(null)
      setShowDaftarForm(false)
      await hydrateResultSummary([kendaraanBaru])
      await handleSelect(kendaraanBaru)
    }
  }

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
          <p className="text-xs text-white/70">{spbuNama || profile.nama}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAduan((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg"
            style={{
              background: showAduan ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)",
              color: "white",
              fontFamily: "var(--bt-font-display)",
            }}
            title="Aduan SPBU"
          >
            <MessageSquareWarning className="size-3.5" />
            Aduan
          </button>
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.15)", color: "var(--bt-led)" }}
          >
            <span className="size-1.5 rounded-full bg-current animate-pulse" />
            Online
          </span>
          <button
            onClick={onSignOut}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.6)" }}
            title="Keluar"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col gap-5 px-4 py-6 max-w-md mx-auto w-full">
        {showAduan && profile.spbu_id ? (
          <AduanPom spbuId={profile.spbu_id} userId={userId} onClose={() => setShowAduan(false)} />
        ) : null}

        {/* Search */}
        <section className="flex flex-col gap-2">
          <label
            htmlFor="plat"
            className="text-xs uppercase tracking-wider font-medium"
            style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.7 }}
          >
            Cari plat kendaraan
          </label>
          <div className="flex gap-2">
            <Input
              id="plat"
              placeholder="CONTOH: KH 3455 DG"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-14 text-2xl tracking-widest text-center uppercase bg-transparent border-2 placeholder:opacity-30 flex-1"
              style={{
                fontFamily: "var(--bt-font-display)",
                fontVariantNumeric: "tabular-nums",
                borderColor: "color-mix(in srgb, var(--bt-led) 40%, transparent)",
                color: "var(--bt-led)",
              }}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--bt-merah)" }}
            >
              {searching ? (
                <Loader2 className="size-5 text-white animate-spin" />
              ) : (
                <Search className="size-5 text-white" />
              )}
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={openDaftarBaru}
            className="h-11 w-full text-sm font-bold uppercase tracking-wider hover:bg-[color-mix(in_srgb,var(--bt-led)_14%,transparent)] hover:text-[var(--bt-led)]"
            style={{
              fontFamily: "var(--bt-font-display)",
              borderColor: "color-mix(in srgb, var(--bt-led) 35%, transparent)",
              color: "var(--bt-led)",
              background: "color-mix(in srgb, var(--bt-led) 8%, transparent)",
            }}
          >
            <Plus className="size-4" />
            Daftar baru
          </Button>
        </section>

        {/* Daftar baru */}
        {showDaftarForm && (
          <section className="flex flex-col gap-3 rounded-xl p-3" style={{ background: "#232323", border: "1px solid rgba(240,211,94,0.16)" }}>
            <div className="flex items-center justify-between gap-2">
              <p
                className="text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.75 }}
              >
                Daftar kendaraan baru
              </p>
              <button
                type="button"
                onClick={() => setShowDaftarForm(false)}
                className="text-xs uppercase tracking-wider px-2 py-1"
                style={{ fontFamily: "var(--bt-font-display)", color: "rgba(255,255,255,0.55)" }}
              >
                Tutup
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="daftar-plat" className="text-xs uppercase tracking-wider" style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.65 }}>
                Plat lengkap
              </Label>
              <Input
                id="daftar-plat"
                value={daftarPlat}
                onChange={(e) => setDaftarPlat(e.target.value.toUpperCase())}
                placeholder="KH 3455 DGF"
                className="h-12 bg-transparent border-2 text-white placeholder:opacity-35"
                style={{ borderColor: "color-mix(in srgb, var(--bt-led) 30%, transparent)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="foto-kendaraan" className="text-xs uppercase tracking-wider" style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.65 }}>
                Foto kendaraan (opsional)
              </Label>
              <input
                id="foto-kendaraan-galeri"
                type="file"
                accept="image/*"
                onChange={(e) => setFotoKendaraan(e.target.files?.[0] ?? null)}
                className="hidden"
                ref={galleryInputRef}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="h-12 rounded-md border-2 flex items-center justify-center px-3 cursor-pointer text-sm font-semibold transition-all active:scale-[0.99]"
                  style={{
                    fontFamily: "var(--bt-font-display)",
                    borderColor: "color-mix(in srgb, var(--bt-led) 30%, transparent)",
                    color: "var(--bt-led)",
                    background: "color-mix(in srgb, var(--bt-led) 6%, transparent)",
                  }}
                >
                  Ambil Foto Kamera
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="h-12 rounded-md border-2 flex items-center justify-center px-3 cursor-pointer text-sm font-semibold transition-all active:scale-[0.99]"
                  style={{
                    fontFamily: "var(--bt-font-display)",
                    borderColor: "color-mix(in srgb, var(--bt-led) 30%, transparent)",
                    color: "var(--bt-led)",
                    background: "color-mix(in srgb, var(--bt-led) 6%, transparent)",
                  }}
                >
                  Pilih dari Galeri
                </button>
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                {fotoKendaraan ? `Terpilih: ${fotoKendaraan.name}` : "Belum ada file dipilih"}
              </p>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
              Cek dulu kecocokan <strong>plat fisik kendaraan</strong> dan <strong>STNK</strong> sebelum simpan.
            </p>
            <Button
              onClick={handleDaftarBaru}
              disabled={daftarLoading}
              className="h-12 text-base font-bold uppercase tracking-wider"
              style={{ fontFamily: "var(--bt-font-display)", background: "var(--bt-biru)" }}
            >
              {daftarLoading ? "Menyimpan..." : "Simpan Kendaraan"}
            </Button>
          </section>
        )}

        {/* Results */}
        {results.length > 0 && (
          <section className="flex flex-col gap-2">
            {results.map((k) => (
              <Card
                key={k.id}
                className={`border-0 shadow-none rounded-lg cursor-pointer transition-all ${
                  selected?.id === k.id ? "ring-2" : ""
                }`}
                style={{
                  background: selected?.id === k.id ? "#2a2a2a" : "#242424",
                  ["--tw-ring-color" as any]: "var(--bt-led)",
                }}
                onClick={() => handleSelect(k)}
              >
                <CardContent className="px-4 py-3">
                  <p
                    className="text-lg font-bold tracking-wider text-white"
                    style={{ fontFamily: "var(--bt-font-display)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {k.plat_lengkap}
                  </p>
                  <div className="mt-2 flex flex-col gap-1">
                    <p
                      className="text-[11px] uppercase tracking-wider font-semibold"
                      style={{
                        fontFamily: "var(--bt-font-display)",
                        color: resultSummary[k.id]?.statusTone === "warn" ? "var(--bt-merah-muda)" : "var(--bt-hijau)",
                      }}
                    >
                      {resultSummary[k.id]?.statusText ?? "Sudah terdaftar"}
                    </p>
                    <p
                      className="text-xs"
                      style={{
                        color: resultSummary[k.id]?.lastTone === "warn"
                          ? "var(--bt-merah-muda)"
                          : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {resultSummary[k.id]?.lastText ?? "Memuat ringkasan..."}
                    </p>
                    {resultSummary[k.id]?.spbuNama ? (
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                        Dicatat di {resultSummary[k.id].spbuNama}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {/* Form ISI / TOLAK — muncul setelah plat dipilih */}
        {selected && showAksiPanel && (
          <section className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="liter"
                  className="text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.7 }}
                >
                  Liter
                </Label>
                <Input
                  id="liter"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder="20"
                  value={liter}
                  disabled={resultSummary[selected.id]?.statusTone === "warn"}
                  onChange={(e) => setLiter(e.target.value.replace(/[^\d]/g, ""))}
                  className="h-14 text-2xl tracking-widest text-center bg-transparent border-2 placeholder:opacity-30 disabled:opacity-40"
                  style={{
                    fontFamily: "var(--bt-font-display)",
                    fontVariantNumeric: "tabular-nums",
                    borderColor: "color-mix(in srgb, var(--bt-led) 40%, transparent)",
                    color: "var(--bt-led)",
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="produk"
                  className="text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.7 }}
                >
                  Produk BBM
                </Label>
                <select
                  id="produk"
                  value={produk}
                  disabled={resultSummary[selected.id]?.statusTone === "warn"}
                  onChange={(e) => setProduk(e.target.value)}
                  className="h-14 px-3 rounded-md border-2 bg-transparent text-base disabled:opacity-40"
                  style={{
                    fontFamily: "var(--bt-font-display)",
                    borderColor: "color-mix(in srgb, var(--bt-led) 40%, transparent)",
                    color: "var(--bt-led)",
                  }}
                >
                  {PRODUK_BBM.map((p) => (
                    <option key={p} value={p} style={{ color: "#111", background: "#fff" }}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleIsi(selected.id)}
                disabled={isiLoading || resultSummary[selected.id]?.statusTone === "warn"}
                className="relative h-20 rounded-2xl text-white font-black text-2xl uppercase tracking-wider flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                style={{
                  fontFamily: "var(--bt-font-display)",
                  background: "linear-gradient(180deg, #00C853 0%, #00873A 100%)",
                  boxShadow: "0 4px 0 #005C28, 0 6px 12px rgba(0,0,0,0.4)",
                }}
              >
                <Fuel className="size-7" strokeWidth={2.5} />
                {isiLoading ? "..." : "ISI"}
              </button>
              <button
                onClick={() => setTolakOpen(true)}
                disabled={tolakLoading}
                className="relative h-20 rounded-2xl text-white font-black text-2xl uppercase tracking-wider flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70"
                style={{
                  fontFamily: "var(--bt-font-display)",
                  background: "linear-gradient(180deg, #E53935 0%, #8B0A1E 100%)",
                  boxShadow: "0 4px 0 #5C0613, 0 6px 12px rgba(0,0,0,0.4)",
                }}
              >
                <ShieldX className="size-7" strokeWidth={2.5} />
                TOLAK
              </button>
            </div>
          </section>
        )}

        {tolakOpen && selected && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => !tolakLoading && setTolakOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-3"
              style={{ background: "#1E1E1E", border: "1px solid rgba(240,211,94,0.2)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3
                  className="text-lg font-bold uppercase tracking-wider text-white"
                  style={{ fontFamily: "var(--bt-font-display)" }}
                >
                  Alasan tolak
                </h3>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {selected.plat_lengkap}
                </p>
              </div>
              {ALASAN_TOLAK.map((a) => (
                <button
                  key={`${a.value}-${a.label}`}
                  type="button"
                  disabled={tolakLoading}
                  onClick={() => {
                    if (a.manual) {
                      setShowManualAlasan(true)
                      return
                    }
                    void handleTolak(selected.id, a.value, a.catatan)
                  }}
                  className="h-14 rounded-xl text-base font-bold uppercase tracking-wide text-white disabled:opacity-70"
                  style={{
                    fontFamily: "var(--bt-font-display)",
                    background: "var(--bt-merah)",
                  }}
                >
                  {tolakLoading ? "..." : a.label}
                </button>
              ))}
              {showManualAlasan && (
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="manual-alasan"
                    className="text-xs uppercase tracking-wider"
                    style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.7 }}
                  >
                    Ketik alasan manual
                  </Label>
                  <Textarea
                    id="manual-alasan"
                    value={manualAlasan}
                    onChange={(e) => setManualAlasan(e.target.value)}
                    placeholder="Contoh: Pengendara tidak bawa dokumen kendaraan"
                    className="min-h-24 bg-transparent border-2 text-white placeholder:opacity-40"
                    style={{ borderColor: "color-mix(in srgb, var(--bt-led) 30%, transparent)" }}
                  />
                  <Button
                    type="button"
                    disabled={tolakLoading}
                    onClick={() => {
                      const text = manualAlasan.trim()
                      if (!text) {
                        toast.error("Isi alasan manual dulu")
                        return
                      }
                      void handleTolak(selected.id, "lainnya", text)
                    }}
                    className="h-12 text-base font-bold uppercase tracking-wider text-white"
                    style={{ fontFamily: "var(--bt-font-display)", background: "var(--bt-merah)" }}
                  >
                    Simpan Alasan
                  </Button>
                </div>
              )}
              <button
                type="button"
                disabled={tolakLoading}
                onClick={() => {
                  setTolakOpen(false)
                  setShowManualAlasan(false)
                  setManualAlasan("")
                }}
                className="h-12 rounded-xl text-sm font-semibold"
                style={{
                  fontFamily: "var(--bt-font-display)",
                  background: "#2a2a2a",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Separator */}
        {selected && (
          <div className="h-px w-full" style={{ background: "color-mix(in srgb, var(--bt-led) 12%, transparent)" }} />
        )}

        {/* Riwayat 7 hari */}
        {selected && (
          <section className="flex flex-col gap-2.5">
            <h2
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.6 }}
            >
              Riwayat 7 hari — {selected.plat_lengkap}
            </h2>

            {riwayatLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin" style={{ color: "var(--bt-led)" }} />
              </div>
            ) : riwayat.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                Belum ada riwayat
              </p>
            ) : (
              riwayat.map((r) => (
                <Card key={r.id} className="border-0 shadow-none rounded-lg" style={{ background: "#242424" }}>
                  <CardContent className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p
                        className="text-base font-bold tracking-wider text-white"
                        style={{ fontFamily: "var(--bt-font-display)", fontVariantNumeric: "tabular-nums" }}
                      >
                        {r.plat_lengkap}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {r.waktu} · {r.spbu_nama}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p
                        className="text-sm font-bold"
                        style={{ fontFamily: "var(--bt-font-display)", color: r.jenis === "tolak" ? "#E8384F" : "var(--bt-led)" }}
                      >
                        {r.jenis === "tolak" ? (r.catatan ? `TOLAK · ${r.catatan}` : "TOLAK") : `${r.liter} L`}
                      </p>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded"
                        style={{
                          background: r.jenis === "tolak"
                            ? "color-mix(in srgb, var(--bt-merah) 20%, transparent)"
                            : r.bbm === "Pertamax"
                              ? "color-mix(in srgb, var(--bt-biru) 20%, transparent)"
                              : "color-mix(in srgb, var(--bt-hijau) 20%, transparent)",
                          color: r.jenis === "tolak"
                            ? "var(--bt-merah-muda)"
                            : r.bbm === "Pertamax" ? "var(--bt-biru)" : "var(--bt-hijau)",
                        }}
                      >
                        {r.bbm}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        )}

        {/* Riwayat SPBU hari ini */}
        <section className="flex flex-col gap-2.5">
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.6 }}
          >
            Riwayat SPBU hari ini
          </h2>
          {riwayatSpbuLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin" style={{ color: "var(--bt-led)" }} />
            </div>
          ) : riwayatSpbuHariIni.length === 0 ? (
            <p className="text-sm py-3 text-center" style={{ color: "rgba(255,255,255,0.45)" }}>
              Belum ada transaksi/tolakan hari ini
            </p>
          ) : (
            <>
              {(riwayatSpbuExpanded ? riwayatSpbuHariIni : riwayatSpbuHariIni.slice(0, 10)).map((r) => (
                <Card key={r.id} className="border-0 shadow-none rounded-lg" style={{ background: "#242424" }}>
                  <CardContent className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p
                        className="text-base font-bold tracking-wider text-white"
                        style={{ fontFamily: "var(--bt-font-display)", fontVariantNumeric: "tabular-nums" }}
                      >
                        {r.plat_lengkap}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {r.waktu}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p
                        className="text-sm font-bold"
                        style={{ fontFamily: "var(--bt-font-display)", color: r.jenis === "tolak" ? "#E8384F" : "var(--bt-led)" }}
                      >
                        {r.jenis === "tolak" ? "TOLAK" : `${r.liter} L`}
                      </p>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded"
                        style={{
                          background: r.jenis === "tolak"
                            ? "color-mix(in srgb, var(--bt-merah) 20%, transparent)"
                            : r.bbm === "Pertamax"
                              ? "color-mix(in srgb, var(--bt-biru) 20%, transparent)"
                              : "color-mix(in srgb, var(--bt-hijau) 20%, transparent)",
                          color: r.jenis === "tolak"
                            ? "var(--bt-merah-muda)"
                            : r.bbm === "Pertamax" ? "var(--bt-biru)" : "var(--bt-hijau)",
                        }}
                      >
                        {r.jenis === "tolak" ? (r.catatan || "TOLAK") : r.bbm}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {riwayatSpbuHariIni.length > 10 && (
                <Button
                  type="button"
                  onClick={() => setRiwayatSpbuExpanded((v) => !v)}
                  variant="secondary"
                  className="h-10 text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--bt-font-display)" }}
                >
                  {riwayatSpbuExpanded ? "Lihat lebih sedikit" : "Lihat lebih banyak"}
                </Button>
              )}
            </>
          )}
        </section>
      </main>

      {cameraOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col gap-3 p-4"
            style={{ background: "#1E1E1E", border: "1px solid rgba(240,211,94,0.2)" }}
          >
            <h3
              className="text-lg font-bold uppercase tracking-wider text-white"
              style={{ fontFamily: "var(--bt-font-display)" }}
            >
              Kamera
            </h3>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-xl bg-black aspect-[4/3] object-cover"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={capturePhoto}
                className="h-12 rounded-xl text-sm font-bold uppercase tracking-wider text-white"
                style={{ fontFamily: "var(--bt-font-display)", background: "var(--bt-hijau)" }}
              >
                Ambil
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="h-12 rounded-xl text-sm font-semibold"
                style={{
                  fontFamily: "var(--bt-font-display)",
                  background: "#2a2a2a",
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="px-4 py-2 text-center text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
        Batara Tertib v1 · Muara Teweh
      </footer>
    </div>
  )
}
