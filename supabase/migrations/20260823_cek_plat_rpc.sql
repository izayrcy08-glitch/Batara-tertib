-- V2 Cek plat 7 hari — RPC publik (anon tidak bisa SELECT transaksi/tolakan langsung)
-- Jalankan di Dashboard > SQL Editor

CREATE OR REPLACE FUNCTION public.label_alasan_tolak(
  p_alasan alasan_tolak,
  p_catatan text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_catatan IS NOT NULL AND btrim(p_catatan) <> '' AND p_catatan IN (
      'Sudah isi hari ini', 'STNK tidak cocok', 'Tidak ada plat', 'Tidak ada STNK', 'Lainnya'
    ) THEN btrim(p_catatan)
    WHEN p_catatan IS NOT NULL AND btrim(p_catatan) <> '' THEN btrim(p_catatan)
    WHEN p_alasan = 'isi_ulang_hari_ini' THEN 'Sudah isi hari ini'
    WHEN p_alasan = 'stnk_tidak_cocok' THEN 'STNK tidak cocok'
    WHEN p_alasan = 'lainnya' THEN 'Lainnya'
    ELSE 'Tolak'
  END;
$$;

CREATE OR REPLACE FUNCTION public.cek_plat_riwayat(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw text;
  v_compact text;
  v_angka text;
  v_digits_only boolean;
  v_matches record;
  v_candidates text[] := ARRAY[]::text[];
  v_kendaraan_id uuid;
  v_plat_lengkap text;
  v_cutoff timestamptz;
  v_riwayat jsonb;
  v_count int := 0;
BEGIN
  v_raw := upper(btrim(p_query));
  IF char_length(v_raw) < 2 OR char_length(v_raw) > 20 THEN
    RAISE EXCEPTION 'Query tidak valid';
  END IF;

  v_compact := regexp_replace(v_raw, '[^A-Z0-9]', '', 'g');
  IF v_compact = '' THEN
    RAISE EXCEPTION 'Query tidak valid';
  END IF;

  v_angka := regexp_replace(v_compact, '[^0-9]', '', 'g');
  v_digits_only := v_compact ~ '^[0-9]+$';

  -- Plat lengkap (compact exact): KH3455DGF = KH 3455 DGF
  FOR v_matches IN
    SELECT id, plat_lengkap
    FROM public.kendaraan
    WHERE regexp_replace(upper(plat_lengkap), '[^A-Z0-9]', '', 'g') = v_compact
    ORDER BY plat_lengkap
    LIMIT 2
  LOOP
    v_candidates := array_append(v_candidates, v_matches.plat_lengkap);
  END LOOP;

  v_count := coalesce(array_length(v_candidates, 1), 0);
  IF v_count = 1 THEN
    NULL; -- lanjut ke fetch riwayat di bawah
  ELSIF v_count > 1 THEN
    RETURN jsonb_build_object(
      'status', 'ambiguous',
      'candidates', to_jsonb(v_candidates)
    );
  ELSE
    v_candidates := ARRAY[]::text[];
  END IF;

  IF v_count = 0 THEN
  IF v_digits_only THEN
    FOR v_matches IN
      SELECT id, plat_lengkap
      FROM public.kendaraan
      WHERE angka_plat = v_compact
      ORDER BY plat_lengkap
      LIMIT 10
    LOOP
      v_candidates := array_append(v_candidates, v_matches.plat_lengkap);
    END LOOP;
  ELSIF v_angka <> '' THEN
    FOR v_matches IN
      SELECT id, plat_lengkap
      FROM public.kendaraan
      WHERE angka_plat = v_angka
      ORDER BY plat_lengkap
      LIMIT 20
    LOOP
      v_candidates := array_append(v_candidates, v_matches.plat_lengkap);
    END LOOP;
  ELSE
    FOR v_matches IN
      SELECT id, plat_lengkap
      FROM public.kendaraan
      WHERE regexp_replace(upper(plat_lengkap), '[^A-Z0-9]', '', 'g') ILIKE '%' || replace(v_compact, '%', '') || '%'
      ORDER BY plat_lengkap
      LIMIT 10
    LOOP
      IF regexp_replace(upper(v_matches.plat_lengkap), '[^A-Z0-9]', '', 'g') = v_compact
         OR regexp_replace(upper(v_matches.plat_lengkap), '[^A-Z0-9]', '', 'g') LIKE v_compact || '%'
      THEN
        v_candidates := array_append(v_candidates, v_matches.plat_lengkap);
      END IF;
    END LOOP;
  END IF;
  END IF;

  v_count := coalesce(array_length(v_candidates, 1), 0);

  IF v_count = 0 THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_count > 1 THEN
    RETURN jsonb_build_object(
      'status', 'ambiguous',
      'candidates', to_jsonb(v_candidates)
    );
  END IF;

  v_plat_lengkap := v_candidates[1];

  SELECT id INTO v_kendaraan_id
  FROM public.kendaraan
  WHERE plat_lengkap = v_plat_lengkap
  LIMIT 1;

  IF v_kendaraan_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  v_cutoff := now() - interval '7 days';

  SELECT coalesce(jsonb_agg(row_to_json(sub) ORDER BY sub.waktu DESC), '[]'::jsonb)
  INTO v_riwayat
  FROM (
    SELECT
      t.created_at AS waktu,
      'isi'::text AS jenis,
      t.liter,
      t.produk::text AS produk,
      s.nama AS spbu_nama,
      NULL::text AS catatan
    FROM public.transaksi t
    INNER JOIN public.spbu s ON s.id = t.spbu_id
    WHERE t.kendaraan_id = v_kendaraan_id
      AND t.created_at >= v_cutoff

    UNION ALL

    SELECT
      tol.created_at,
      'tolak'::text,
      NULL::integer,
      'TOLAK'::text,
      s.nama,
      public.label_alasan_tolak(tol.alasan, tol.catatan)
    FROM public.tolakan tol
    INNER JOIN public.spbu s ON s.id = tol.spbu_id
    WHERE tol.kendaraan_id = v_kendaraan_id
      AND tol.created_at >= v_cutoff

    ORDER BY waktu DESC
    LIMIT 30
  ) sub;

  RETURN jsonb_build_object(
    'status', 'ok',
    'plat_lengkap', v_plat_lengkap,
    'riwayat', v_riwayat
  );
END;
$$;

REVOKE ALL ON FUNCTION public.label_alasan_tolak(alasan_tolak, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cek_plat_riwayat(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cek_plat_riwayat(text) TO anon, authenticated;
