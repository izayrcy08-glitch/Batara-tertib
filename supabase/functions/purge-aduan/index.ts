import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function parseJwt(token: string): { role?: string; ref?: string } | null {
  try {
    const part = token.split(".")[1]
    if (!part) return null
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/")
    const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4)
    return JSON.parse(atob(pad)) as { role?: string; ref?: string }
  } catch {
    return null
  }
}

function projectRefFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname
    return host.split(".")[0] ?? ""
  } catch {
    return ""
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const url = Deno.env.get("SUPABASE_URL") ?? ""
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    ""

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim()
  const claims = parseJwt(token)
  const ref = projectRefFromUrl(url)
  const authorized =
    !!token &&
    ((!!serviceKey && token === serviceKey) ||
      (claims?.role === "service_role" && !!ref && claims.ref === ref))

  if (!authorized) {
    return json({ error: "Unauthorized" }, 401)
  }

  if (!url) return json({ error: "Missing URL" }, 500)

  const admin = createClient(url, serviceKey || token)

  // H+7 setelah dijawab: dijawab_at + 7 hari < sekarang
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: rows, error: selErr } = await admin
    .from("aduan")
    .select("id, foto_path")
    .not("dijawab_at", "is", null)
    .lt("dijawab_at", cutoff)
    .limit(200)

  if (selErr) {
    console.error(selErr)
    return json({ error: "Gagal memuat aduan" }, 500)
  }

  const list = rows ?? []
  if (list.length === 0) {
    return json({ purged: 0, message: "Tidak ada aduan kadaluarsa" })
  }

  const paths = list.map((r) => r.foto_path).filter((p): p is string => !!p && p.length > 0)
  if (paths.length > 0) {
    const { error: rmErr } = await admin.storage.from("aduan").remove(paths)
    if (rmErr) console.error("storage remove", rmErr)
  }

  const ids = list.map((r) => r.id)
  const { error: delErr } = await admin.from("aduan").delete().in("id", ids)
  if (delErr) {
    console.error(delErr)
    return json({ error: "Gagal menghapus aduan" }, 500)
  }

  return json({ purged: ids.length, photos: paths.length })
})
