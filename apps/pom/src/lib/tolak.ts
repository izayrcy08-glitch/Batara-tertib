/** Label lapangan untuk kode alasan tolak (DB enum / catatan). */
export function labelAlasanTolak(alasan?: string | null, catatan?: string | null): string {
  const map: Record<string, string> = {
    isi_ulang_hari_ini: "Sudah isi hari ini",
    stnk_tidak_cocok: "STNK tidak cocok",
    tidak_ada_plat: "Tidak ada plat",
    tidak_ada_stnk: "Tidak ada STNK",
    lainnya: "Lainnya",
  }
  if (catatan && map[catatan]) return map[catatan]
  if (catatan && catatan.trim()) return catatan.trim()
  if (alasan && map[alasan]) return map[alasan]
  return "Tolak"
}
