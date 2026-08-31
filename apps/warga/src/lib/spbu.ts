export type SpbuPage = {
  id: string
  nama: string
  slug: string
}

/** Seed V1 — dipakai jika build tanpa env Supabase. */
export const SPBU_FALLBACK: SpbuPage[] = [
  { id: "a0000000-0000-0000-0000-000000000001", nama: "SPBU PERUSDA", slug: "perusda" },
  { id: "a0000000-0000-0000-0000-000000000002", nama: "SPBU JL PENDREH", slug: "jl-pendreh" },
  { id: "a0000000-0000-0000-0000-000000000003", nama: "SPBU JL PRAMUKA", slug: "jl-pramuka" },
  { id: "a0000000-0000-0000-0000-000000000004", nama: "SPBU JINGAH", slug: "jingah" },
  { id: "a0000000-0000-0000-0000-000000000005", nama: "SPBU KM 02 JL BRIGJEN KATAMSO", slug: "km-02-jl-brigjen-katamso" },
]

export function slugFromNama(nama: string): string {
  return nama
    .toLowerCase()
    .replace(/^spbu\s+/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function getSpbuPages(): Promise<SpbuPage[]> {
  const url = import.meta.env.PUBLIC_SUPABASE_URL
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return SPBU_FALLBACK

  try {
    const res = await fetch(
      `${url}/rest/v1/spbu?aktif=eq.true&select=id,nama&order=nama`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    )
    if (!res.ok) return SPBU_FALLBACK
    const data = (await res.json()) as { id: string; nama: string }[]
    if (!Array.isArray(data) || data.length === 0) return SPBU_FALLBACK
    return data.map((s) => ({
      id: s.id,
      nama: s.nama,
      slug: slugFromNama(s.nama),
    }))
  } catch {
    return SPBU_FALLBACK
  }
}
