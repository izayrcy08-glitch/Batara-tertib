-- Hapus antrian dari RPC set_kondisi_spbu (kolom spbu.antrian dibiarkan)

CREATE OR REPLACE FUNCTION public.set_kondisi_spbu(
  p_stok_pertalite stok_kondisi,
  p_stok_pertamax stok_kondisi
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
    kondisi_diubah = now()
  WHERE id = v_spbu;
END;
$$;

REVOKE ALL ON FUNCTION public.set_kondisi_spbu(stok_kondisi, stok_kondisi) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_kondisi_spbu(stok_kondisi, stok_kondisi) TO authenticated;
