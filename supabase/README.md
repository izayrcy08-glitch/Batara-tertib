# Supabase — Batara Tertib

Belum ada project cloud di V0. Folder ini disiapkan untuk migrasi V1.

## Tabel inti (rencana V1)

| Tabel | Fungsi |
|-------|--------|
| `spbu` | Nama, aktif. Awal: 5 pompa di Muara Teweh. |
| `user` | Admin atau petugas, terikat `spbu_id` jika petugas. |
| `kendaraan` | `plat_lengkap` unik, `angka_plat`, `foto_kendaraan` opsional. |
| `transaksi` | Plat, matching STNK, liter, produk, waktu, spbu, user_id. |
| `tolakan` | Plat, alasan (stnk / isi_ulang_hari_ini), waktu, spbu, user_id. |
| `aduan` | Kode lacak, spbu, kategori, isi, foto opsional, status. |
| `hak_jawab` | Jawaban SPBU di utas aduan. |
| `stok_status` | Opsional, stok BBM per pompa. |

## Aturan bisnis di DB

- 1 plat lengkap = 1 isi sukses per hari kalender WIB, di pompa mana pun di jaringan.
- Kendaraan didaftar sekali, milik jaringan (semua SPBU melihat).
- Aduan tidak dihapus oleh SPBU, hanya disembunyikan admin.

## Cara pakai nanti

```sh
npx supabase init      # sudah dilakukan
npx supabase start     # nyalakan lokal (butuh Docker)
# Buat migrasi: supabase/migrations/YYYYMMDDHHMMSS_*.sql
```
