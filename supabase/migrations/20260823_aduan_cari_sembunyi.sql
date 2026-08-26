-- V2 Cari aduan (kode lacak) + sembunyikan aduan melanggar (admin)
-- Jalankan di Dashboard > SQL Editor

-- ============================================================
-- COLUMN
-- ============================================================

ALTER TABLE public.aduan
  ADD COLUMN IF NOT EXISTS disembunyikan boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disembunyikan_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_aduan_disembunyikan
  ON public.aduan (disembunyikan)
  WHERE disembunyikan = true;

-- ============================================================
-- GUARD UPDATE: jawab (petugas/admin) ATAU sembunyi (admin saja)
-- ============================================================

CREATE OR REPLACE FUNCTION public.aduan_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_hide_only boolean;
BEGIN
  v_role := public.get_my_role();

  -- Admin: boleh hanya ubah flag sembunyi (tanpa ubah isi/jawaban)
  v_hide_only :=
    NEW.kode_lacak IS NOT DISTINCT FROM OLD.kode_lacak
    AND NEW.spbu_id IS NOT DISTINCT FROM OLD.spbu_id
    AND NEW.judul IS NOT DISTINCT FROM OLD.judul
    AND NEW.isi IS NOT DISTINCT FROM OLD.isi
    AND NEW.foto_path IS NOT DISTINCT FROM OLD.foto_path
    AND NEW.foto_url IS NOT DISTINCT FROM OLD.foto_url
    AND NEW.jawaban IS NOT DISTINCT FROM OLD.jawaban
    AND NEW.dijawab_at IS NOT DISTINCT FROM OLD.dijawab_at
    AND NEW.dijawab_oleh IS NOT DISTINCT FROM OLD.dijawab_oleh
    AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
    AND NEW.disembunyikan IS DISTINCT FROM OLD.disembunyikan;

  IF v_hide_only THEN
    IF v_role IS DISTINCT FROM 'admin' OR NOT public.get_my_aktif() THEN
      RAISE EXCEPTION 'Hanya admin yang boleh menyembunyikan aduan';
    END IF;
    IF NEW.disembunyikan THEN
      NEW.disembunyikan_at := COALESCE(NEW.disembunyikan_at, now());
    ELSE
      NEW.disembunyikan_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- Jalur jawab: satu kali, field isi terkunci
  IF OLD.dijawab_at IS NOT NULL THEN
    RAISE EXCEPTION 'Aduan sudah dijawab';
  END IF;
  IF NEW.jawaban IS NULL OR btrim(NEW.jawaban) = '' THEN
    RAISE EXCEPTION 'Jawaban wajib';
  END IF;

  NEW.jawaban := btrim(NEW.jawaban);
  NEW.dijawab_at := COALESCE(NEW.dijawab_at, now());
  NEW.dijawab_oleh := COALESCE(NEW.dijawab_oleh, auth.uid());
  NEW.kode_lacak := OLD.kode_lacak;
  NEW.spbu_id := OLD.spbu_id;
  NEW.judul := OLD.judul;
  NEW.isi := OLD.isi;
  NEW.foto_path := OLD.foto_path;
  NEW.foto_url := OLD.foto_url;
  NEW.created_at := OLD.created_at;
  NEW.disembunyikan := OLD.disembunyikan;
  NEW.disembunyikan_at := OLD.disembunyikan_at;
  RETURN NEW;
END;
$$;

-- Policy UPDATE: admin boleh update kapan saja (sembunyi); petugas hanya sebelum dijawab di SPBU sendiri
DROP POLICY IF EXISTS aduan_update_jawab ON public.aduan;
CREATE POLICY aduan_update_jawab ON public.aduan
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_aktif()
    AND (
      public.get_my_role() = 'admin'
      OR (
        public.get_my_role() = 'petugas'
        AND spbu_id = public.get_my_spbu_id()
        AND dijawab_at IS NULL
      )
    )
  )
  WITH CHECK (
    public.get_my_aktif()
    AND (
      public.get_my_role() = 'admin'
      OR (
        public.get_my_role() = 'petugas'
        AND spbu_id = public.get_my_spbu_id()
      )
    )
  );

-- ============================================================
-- RPC publik: lacak status by kode
-- ============================================================

CREATE OR REPLACE FUNCTION public.cek_aduan(p_kode text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kode text;
  v_row record;
BEGIN
  v_kode := upper(btrim(COALESCE(p_kode, '')));
  IF char_length(v_kode) <> 8 THEN
    RAISE EXCEPTION 'Kode tidak valid';
  END IF;
  IF v_kode !~ '^[A-Z0-9]+$' THEN
    RAISE EXCEPTION 'Kode tidak valid';
  END IF;

  SELECT
    a.kode_lacak,
    a.judul,
    a.isi,
    a.foto_url,
    a.jawaban,
    a.dijawab_at,
    a.created_at,
    a.disembunyikan,
    s.nama AS spbu_nama
  INTO v_row
  FROM public.aduan a
  INNER JOIN public.spbu s ON s.id = a.spbu_id
  WHERE a.kode_lacak = v_kode
  LIMIT 1;

  -- Sembunyi = sama seperti tidak ketemu (jangan bocorkan keberadaan)
  IF NOT FOUND OR v_row.disembunyikan THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  RETURN jsonb_build_object(
    'status', 'ok',
    'kode_lacak', v_row.kode_lacak,
    'judul', v_row.judul,
    'isi', v_row.isi,
    'foto_url', v_row.foto_url,
    'spbu_nama', v_row.spbu_nama,
    'jawaban', v_row.jawaban,
    'dijawab_at', v_row.dijawab_at,
    'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cek_aduan(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cek_aduan(text) TO anon, authenticated;
