import { createClient } from "npm:@supabase/supabase-js@2"
import { z } from "npm:zod@3"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const passwordSchema = z.string().min(8).max(72)

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    nama: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(120),
    password: passwordSchema,
    spbu_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("update"),
    id: z.string().uuid(),
    nama: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(120),
    spbu_id: z.string().uuid(),
    aktif: z.boolean(),
  }),
  z.object({
    action: z.literal("reset_password"),
    id: z.string().uuid(),
    password: passwordSchema,
  }),
  z.object({
    action: z.literal("delete"),
    id: z.string().uuid(),
  }),
])

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function clientError(message: string, status = 400) {
  return json({ error: message }, status)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? ""
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? ""

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return clientError("Tidak diizinkan", 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace(/^Bearer\s+/i, "")
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr || !userData.user) return clientError("Tidak diizinkan", 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: caller, error: callerErr } = await admin
      .from("profiles")
      .select("id, role, aktif")
      .eq("id", userData.user.id)
      .single()

    if (callerErr || !caller || caller.role !== "admin" || caller.aktif === false) {
      return clientError("Tidak diizinkan", 403)
    }

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return clientError("Data tidak valid")

    const body = parsed.data

    if (body.action === "create") {
      const { count, error: countErr } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("spbu_id", body.spbu_id)
        .eq("role", "petugas")
        .eq("aktif", true)
      if (countErr) {
        console.error("count petugas", countErr)
        return clientError("Tidak bisa menyimpan petugas", 500)
      }
      if ((count ?? 0) >= 2) return clientError("Max 2 petugas aktif di SPBU ini")

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { nama: body.nama, role: "petugas", spbu_id: body.spbu_id },
      })
      if (createErr || !created.user) {
        console.error("createUser", createErr)
        if (createErr?.message?.toLowerCase().includes("already")) {
          return clientError("Email sudah terpakai")
        }
        return clientError("Tidak bisa menyimpan petugas", 500)
      }

      const { error: profileErr } = await admin
        .from("profiles")
        .update({ nama: body.nama, email: body.email, spbu_id: body.spbu_id, role: "petugas", aktif: true })
        .eq("id", created.user.id)
      if (profileErr) {
        console.error("profile after create", profileErr)
        await admin.auth.admin.deleteUser(created.user.id)
        if (profileErr.message.includes("Max 2")) return clientError("Max 2 petugas aktif di SPBU ini")
        return clientError("Tidak bisa menyimpan petugas", 500)
      }

      return json({ ok: true, id: created.user.id })
    }

    const { data: target, error: targetErr } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", body.id)
      .single()
    if (targetErr || !target) return clientError("Petugas tidak ditemukan", 404)
    if (target.role !== "petugas") return clientError("Tidak diizinkan", 403)

    if (body.action === "update") {
      if (body.aktif) {
        const { count, error: countErr } = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("spbu_id", body.spbu_id)
          .eq("role", "petugas")
          .eq("aktif", true)
          .neq("id", body.id)
        if (countErr) {
          console.error("count petugas update", countErr)
          return clientError("Tidak bisa menyimpan petugas", 500)
        }
        if ((count ?? 0) >= 2) return clientError("Max 2 petugas aktif di SPBU ini")
      }

      const { error: authErr } = await admin.auth.admin.updateUserById(body.id, {
        email: body.email,
        user_metadata: { nama: body.nama, role: "petugas", spbu_id: body.spbu_id },
      })
      if (authErr) {
        console.error("updateUser", authErr)
        if (authErr.message?.toLowerCase().includes("already")) return clientError("Email sudah terpakai")
        return clientError("Tidak bisa menyimpan petugas", 500)
      }

      const { error: profileErr } = await admin
        .from("profiles")
        .update({
          nama: body.nama,
          email: body.email,
          spbu_id: body.spbu_id,
          aktif: body.aktif,
        })
        .eq("id", body.id)
      if (profileErr) {
        console.error("update profile", profileErr)
        if (profileErr.message.includes("Max 2")) return clientError("Max 2 petugas aktif di SPBU ini")
        return clientError("Tidak bisa menyimpan petugas", 500)
      }

      return json({ ok: true })
    }

    if (body.action === "reset_password") {
      const { error } = await admin.auth.admin.updateUserById(body.id, { password: body.password })
      if (error) {
        console.error("reset password", error)
        return clientError("Tidak bisa menyimpan sandi", 500)
      }
      return json({ ok: true })
    }

    const [{ count: trxCount }, { count: tolakCount }] = await Promise.all([
      admin.from("transaksi").select("id", { count: "exact", head: true }).eq("user_id", body.id),
      admin.from("tolakan").select("id", { count: "exact", head: true }).eq("user_id", body.id),
    ])
    const hasRecords = (trxCount ?? 0) + (tolakCount ?? 0) > 0

    if (hasRecords) {
      const { error } = await admin.from("profiles").update({ aktif: false }).eq("id", body.id)
      if (error) {
        console.error("deactivate", error)
        return clientError("Tidak bisa menonaktifkan petugas", 500)
      }
      return json({ ok: true, deactivated: true })
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(body.id)
    if (delErr) {
      console.error("deleteUser", delErr)
      return clientError("Tidak bisa menghapus petugas", 500)
    }
    return json({ ok: true, deleted: true })
  } catch (err) {
    console.error("admin-users", err)
    return clientError("Tidak bisa menyimpan petugas", 500)
  }
})
