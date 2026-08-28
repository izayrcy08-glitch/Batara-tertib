import { useEffect, useState } from "react"
import { Download, Share } from "lucide-react"
import { Button } from "@batara/ui/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  return isIOS && !/CriOS|FxiOS|EdgiOS/.test(ua)
}

export function InstallPrompt() {
  const [standalone] = useState(() => isStandalone())
  const [ios] = useState(() => isIosSafari())
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (standalone) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall)
  }, [standalone])

  if (standalone) return null
  if (!deferredPrompt && !ios) return null

  async function handleInstall() {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") setDeferredPrompt(null)
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div
      className="rounded-xl border-2 px-4 py-3 flex flex-col gap-3"
      style={{
        borderColor: "color-mix(in srgb, var(--bt-led) 35%, transparent)",
        background: "color-mix(in srgb, var(--bt-fascia) 40%, var(--bt-aspal))",
      }}
    >
      {deferredPrompt ? (
        <>
          <p className="text-sm text-white/80">
            Pasang di layar utama supaya buka cepat dari ikon pompa.
          </p>
          <Button
            type="button"
            disabled={installing}
            onClick={handleInstall}
            className="h-11 w-full text-sm font-bold uppercase tracking-wider"
            style={{
              fontFamily: "var(--bt-font-display)",
              background: "var(--bt-led)",
              color: "var(--bt-aspal)",
            }}
          >
            <Download className="size-4 mr-2" aria-hidden />
            {installing ? "Memasang..." : "Pasang aplikasi"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-white/80 flex items-start gap-2">
            <Share className="size-4 shrink-0 mt-0.5" style={{ color: "var(--bt-led)" }} aria-hidden />
            <span>
              Di iPhone/iPad: ketuk <strong className="text-white">Bagikan</strong> lalu{" "}
              <strong className="text-white">Tambah ke Layar Utama</strong>.
            </span>
          </p>
        </>
      )}
    </div>
  )
}
