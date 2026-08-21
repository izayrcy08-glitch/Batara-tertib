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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // Cron / manual: Bearer service role atau header cron secret
  const auth = req.headers.get("Authorization") ?? ""
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return json({ error: "Unauthorized" }, 401)
  }

  const url = Deno.env.get("SUPABASE_URL")
  if (!url) return json({ error: "Missing URL" }, 500)

  const admin = createClient(url, serviceKey)

  // H+7 setelah dijawab (WIB): dijawab_at + 7 hari < sekarang
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
