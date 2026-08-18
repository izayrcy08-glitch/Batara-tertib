# Sistem Visual — Batara Tertib

Referensi nyata: fascia hijau SPBU malam, papan harga LED kuning, aspal, garis kuning island, struk thermal.
Bukan logo Pertamina. Nama di fascia: **BATARA TERTIB**.

## Palet (CSS variables `@batara/tokens`)

| Token              | Hex       | Fungsi                            |
|--------------------|-----------|-----------------------------------|
| `--bt-aspal`       | `#161814` | Background pom (malam)            |
| `--bt-fascia`      | `#0F3D2E` | Header / strip identitas (hijau)  |
| `--bt-led`         | `#F0D35E` | Aksi utama, input plat, highlight |
| `--bt-pertalite`   | `#5B8C2A` | Boleh isi / sukses                |
| `--bt-pertamax`    | `#1A3A6B` | Aksen sekunder                    |
| `--bt-tolak`       | `#B42318` | Tolak / error / destructive       |
| `--bt-struk`       | `#F3EFE4` | Background warga (siang) / kartu  |
| `--bt-tinta`       | `#1C1C14` | Teks utama                        |

## Huruf

- **Barlow Condensed** — plat, angka liter, wordmark, display. Self-host `@fontsource`.
- **Source Sans 3** — teks biasa, paragraf. Self-host `@fontsource`.
- Plat selalu `font-variant-numeric: tabular-nums`.
- Bukan Inter, Geist, atau font shadcn default.

## Dua kulit, satu token

### Warga — siang di depan pompa
- Latar `--bt-struk` (krem)
- Strip fascia penuh lebar di atas
- Wordmark Barlow Condensed
- Kartu SPBU seperti papan pengumuman
- Satu kolom mobile-first

### Petugas `/pom` — komputer island malam
- Latar `--bt-aspal` (gelap)
- Input plat besar (LED kuning, Barlow Condensed, `text-4xl`)
- Pratinjau pecahan: `KH · 3455 · DGF`
- Tombol ISI (pertalite) dan TOLAK (destructive) kontras tinggi, ibu jari
- Riwayat seperti gulungan struk (kartu krem di atas aspal)

## Responsif

- Petugas: 390px dulu (HP/tablet pompa)
- Warga: 390px + 1024px
- `prefers-reduced-motion` untuk animasi

## Komponen

shadcn/ui `base-nova` sebagai primitive (Button, Input, Card, Badge, dll).
Skin lewat token `@batara/tokens`. Jangan pakai warna default shadcn (zinc/ungu).
