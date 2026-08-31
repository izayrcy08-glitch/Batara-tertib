-- Feed aduan publik 7 hari (beranda warga) + hak jawab SPBU
-- Tidak bocorkan kode_lacak; aduan disembunyikan admin tidak ikut.
-- Jalankan di Dashboard > SQL Editor

CREATE OR REPLACE FUNCTION public.daftar_aduan_publik()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'judul', x.judul,
        'isi', x.isi,
        'foto_url', x.foto_url,
        'spbu_nama', x.spbu_nama,
        'jawaban', x.jawaban,
        'dijawab_at', x.dijawab_at,
        'created_at', x.created_at
      )
      ORDER BY x.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM (
    SELECT
      a.judul,
      a.isi,
      a.foto_url,
      s.nama AS spbu_nama,
      a.jawaban,
      a.dijawab_at,
      a.created_at
    FROM public.aduan a
    INNER JOIN public.spbu s ON s.id = a.spbu_id
    WHERE a.disembunyikan = false
      AND a.created_at >= (now() - interval '7 days')
    ORDER BY a.created_at DESC
    LIMIT 30
  ) x;

  RETURN jsonb_build_object('status', 'ok', 'items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.daftar_aduan_publik() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.daftar_aduan_publik() TO anon, authenticated;
