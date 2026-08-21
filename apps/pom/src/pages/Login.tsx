import { useState } from "react"
import { Fuel, Eye, EyeOff } from "lucide-react"
import { Button } from "@batara/ui/components/ui/button"
import { Input } from "@batara/ui/components/ui/input"
import { Label } from "@batara/ui/components/ui/label"

type Props = {
  onLogin: (email: string, password: string) => Promise<Error | null>
}

export function Login({ onLogin }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const err = await onLogin(email, password)
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bt-aspal)" }}
    >
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Branding */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="size-16 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--bt-merah)" }}
          >
            <Fuel className="size-8 text-white" strokeWidth={2.5} />
          </div>
          <h1
            className="text-2xl font-bold tracking-wide uppercase text-white"
            style={{ fontFamily: "var(--bt-font-display)" }}
          >
            Batara Tertib
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            Login petugas / admin
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="email"
              className="text-xs uppercase tracking-wider font-medium"
              style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.7 }}
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="petugas@spbu.id"
              className="h-12 px-4 bg-transparent border-2 text-white placeholder:opacity-30"
              style={{ borderColor: "color-mix(in srgb, var(--bt-led) 30%, transparent)" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="password"
              className="text-xs uppercase tracking-wider font-medium"
              style={{ fontFamily: "var(--bt-font-display)", color: "var(--bt-led)", opacity: 0.7 }}
            >
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 px-4 pr-12 bg-transparent border-2 text-white placeholder:opacity-30"
                style={{ borderColor: "color-mix(in srgb, var(--bt-led) 30%, transparent)" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 flex items-center justify-center"
                style={{ color: "rgba(255,255,255,0.6)" }}
                aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: "var(--bt-merah-muda)" }}>
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-12 text-base font-bold uppercase tracking-wider text-white"
            style={{
              fontFamily: "var(--bt-font-display)",
              background: "var(--bt-merah)",
            }}
          >
            {loading ? "Masuk..." : "Masuk"}
          </Button>
        </form>

        <p
          className="text-center text-xs"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          Batara Tertib v1 · Muara Teweh
        </p>
      </div>
    </div>
  )
}
