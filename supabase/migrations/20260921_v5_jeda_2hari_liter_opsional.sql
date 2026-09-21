-- V5 — Jeda Pertalite jadi 2 hari kalender (bukan 48 jam) + liter jadi opsional
-- Contoh jeda: isi tanggal 20 (jam berapa pun) -> boleh isi lagi mulai tanggal 22, jam 00:00.
-- Liter dibuat nullable karena aplikasi sementara beralih ke mode deteksi kendaraan tanpa
-- input jumlah liter. Kolom & infrastruktur liter TIDAK dihapus, hanya dilonggarkan,
-- supaya bisa dipakai lagi begitu literan diterapkan di semua SPBU.
-- Jalankan di Supabase Dashboard > SQL Editor

-- Liter opsional: lepas NOT NULL, longgarkan CHECK jadi boleh NULL
ALTER TABLE transaksi ALTER COLUMN liter DROP NOT NULL;

ALTER TABLE transaksi DROP CONSTRAINT IF EXISTS transaksi_liter_check;
ALTER TABLE transaksi
  ADD CONSTRAINT transaksi_liter_check
  CHECK (liter IS NULL OR liter > 0);

ALTER TABLE transaksi DROP CONSTRAINT IF EXISTS chk_pertalite_max_liter;
ALTER TABLE transaksi
  ADD CONSTRAINT chk_pertalite_max_liter
  CHECK (produk <> 'Pertalite' OR liter IS NULL OR liter <= 30) NOT VALID;

-- Pertalite: jeda 2 hari kalender (WITA/WIB, Asia/Jakarta) sejak isi Pertalite terakhir,
-- bukan lagi interval 48 jam. Isi tanggal D -> boleh lagi mulai tanggal D+2.
CREATE OR REPLACE FUNCTION public.enforce_pertalite_jeda_48jam()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  last_isi timestamptz;
  last_tanggal date;
  tanggal_baru date;
BEGIN
  IF NEW.produk = 'Pertalite' THEN
    SELECT max(created_at) INTO last_isi
      FROM transaksi
      WHERE kendaraan_id = NEW.kendaraan_id AND produk = 'Pertalite';

    IF last_isi IS NOT NULL THEN
      last_tanggal := (last_isi AT TIME ZONE 'Asia/Jakarta')::date;
      tanggal_baru := (NEW.created_at AT TIME ZONE 'Asia/Jakarta')::date;

      IF tanggal_baru < last_tanggal + 2 THEN
        RAISE EXCEPTION 'PERTALITE_JEDA_2HARI';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
