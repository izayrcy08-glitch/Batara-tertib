-- Fix: produk_bbm enum vs text di filter p_produk (error 42883)
-- Jalankan di Dashboard > SQL Editor jika belum di-apply via CLI.

CREATE OR REPLACE FUNCTION public.rekap_bbm(
  p_from date,
  p_to date,
  p_spbu_id uuid DEFAULT NULL,
  p_produk text DEFAULT NULL
)
RETURNS TABLE (
  spbu_id uuid,
  spbu_nama text,
  pertalite integer,
  pertamax integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_from IS NULL OR p_to IS NULL THEN
    RAISE EXCEPTION 'Tanggal wajib';
  END IF;
  IF p_from > p_to THEN
    RAISE EXCEPTION 'Rentang tanggal tidak valid';
  END IF;
  IF (p_to - p_from) > 366 THEN
    RAISE EXCEPTION 'Rentang maksimal 366 hari';
  END IF;
  IF p_produk IS NOT NULL AND p_produk NOT IN ('Pertalite', 'Pertamax') THEN
    RAISE EXCEPTION 'Produk tidak valid';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.nama,
    COALESCE(SUM(t.liter) FILTER (WHERE t.produk = 'Pertalite'::produk_bbm), 0)::integer,
    COALESCE(SUM(t.liter) FILTER (WHERE t.produk = 'Pertamax'::produk_bbm), 0)::integer
  FROM spbu s
  INNER JOIN transaksi t
    ON t.spbu_id = s.id
   AND (t.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN p_from AND p_to
   AND t.produk IN ('Pertalite'::produk_bbm, 'Pertamax'::produk_bbm)
   AND (p_produk IS NULL OR t.produk = p_produk::produk_bbm)
  WHERE (p_spbu_id IS NULL OR s.id = p_spbu_id)
  GROUP BY s.id, s.nama
  HAVING COALESCE(SUM(t.liter), 0) > 0
  ORDER BY s.nama;
END;
$$;

REVOKE ALL ON FUNCTION public.rekap_bbm(date, date, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rekap_bbm(date, date, uuid, text) TO anon, authenticated;
