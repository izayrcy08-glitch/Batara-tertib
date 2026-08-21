import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import type { Session } from "@supabase/supabase-js"

export type Profile = {
  id: string
  nama: string
  role: "admin" | "petugas"
  spbu_id: string | null
  aktif: boolean
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) void fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) void fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfileRow(userId: string) {
    const full = await supabase
      .from("profiles")
      .select("id, nama, role, spbu_id, aktif")
      .eq("id", userId)
      .single()
    if (!full.error && full.data) return full.data as Profile

    const basic = await supabase
      .from("profiles")
      .select("id, nama, role, spbu_id")
      .eq("id", userId)
      .single()
    if (basic.error || !basic.data) return null
    return { ...basic.data, aktif: true } as Profile
  }

  async function fetchProfile(userId: string) {
    const data = await loadProfileRow(userId)

    if (!data) {
      setProfile(null)
      setLoading(false)
      return
    }

    if (data.aktif === false) {
      await supabase.auth.signOut()
      setProfile(null)
      setSession(null)
      setLoading(false)
      return
    }

    setProfile(data)
    setLoading(false)
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return new Error("Email atau password salah")

    const row = await loadProfileRow(data.user.id)
    if (row?.aktif === false) {
      await supabase.auth.signOut()
      return new Error("Akun nonaktif. Hubungi admin.")
    }

    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, profile, loading, signIn, signOut }
}
