-- V3 Stok/antrian — kolom manual per SPBU + RPC petugas

CREATE TYPE stok_kondisi AS ENUM ('ada', 'kosong');
CREATE TYPE antrian_kondisi AS ENUM ('sepi', 'sedang', 'ramai');

ALTER TABLE spbu
  ADD COLUMN IF NOT EXISTS stok_pertalite stok_kondisi NOT NULL DEFAULT 'ada',
  ADD COLUMN IF NOT EXISTS stok_pertamax stok_kondisi NOT NULL DEFAULT 'ada',
  ADD COLUMN IF NOT EXISTS antrian antrian_kondisi NOT NULL DEFAULT 'sepi',
  ADD COLUMN IF NOT EXISTS kondisi_diubah timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_kondisi_spbu(
  p_stok_pertalite stok_kondisi,
  p_stok_pertamax stok_kondisi,
  p_antrian antrian_kondisi
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spbu uuid;
  v_role user_role;
BEGIN
  SELECT role, spbu_id INTO v_role, v_spbu FROM profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'petugas' OR v_spbu IS NULL THEN
    RAISE EXCEPTION 'Hanya petugas SPBU yang boleh ubah kondisi';
  END IF;

  UPDATE spbu SET
    stok_pertalite = p_stok_pertalite,
    stok_pertamax = p_stok_pertamax,
    antrian = p_antrian,
    kondisi_diubah = now()
  WHERE id = v_spbu;
END;
$$;

REVOKE ALL ON FUNCTION public.set_kondisi_spbu FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_kondisi_spbu TO authenticated;
