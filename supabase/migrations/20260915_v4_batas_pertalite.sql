-- V4 — Batas khusus Pertalite: maks 30 liter/isi + jeda 48 jam per kendaraan
-- Pertamax dibebaskan total (aturan lama 1x/hari dihapus untuk semua produk).
-- Jalankan di Supabase Dashboard > SQL Editor

-- Hapus aturan lama "1 plat = 1 isi per hari" (berlaku semua produk)
DROP INDEX IF EXISTS idx_satu_isi_per_hari;

-- Pertalite maksimal 30 liter per pengisian
ALTER TABLE transaksi
  ADD CONSTRAINT chk_pertalite_max_liter
  CHECK (produk <> 'Pertalite' OR liter <= 30) NOT VALID;

-- Pertalite: jeda minimal 48 jam sejak isi Pertalite terakhir kendaraan yang sama
CREATE OR REPLACE FUNCTION public.enforce_pertalite_jeda_48jam()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  last_isi timestamptz;
BEGIN
  IF NEW.produk = 'Pertalite' THEN
    SELECT max(created_at) INTO last_isi
      FROM transaksi
      WHERE kendaraan_id = NEW.kendaraan_id AND produk = 'Pertalite';

    IF last_isi IS NOT NULL AND NEW.created_at - last_isi < interval '48 hours' THEN
      RAISE EXCEPTION 'PERTALITE_JEDA_48JAM';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pertalite_jeda_48jam
  BEFORE INSERT ON transaksi
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pertalite_jeda_48jam();
