-- V2 Aduan — jalankan di Dashboard > SQL Editor
-- Tabel aduan, kode lacak, RLS, bucket Storage aduan (+ kebijakan kendaraan jika belum)

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.aduan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_lacak text NOT NULL,
  spbu_id uuid NOT NULL REFERENCES public.spbu (id),
  judul text NOT NULL,
  isi text NOT NULL,
  foto_path text,
  foto_url text,
  jawaban text,
  dijawab_at timestamptz,
  dijawab_oleh uuid REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aduan_judul_len CHECK (char_length(trim(judul)) BETWEEN 3 AND 120),
  CONSTRAINT aduan_isi_len CHECK (char_length(trim(isi)) BETWEEN 5 AND 2000),
  CONSTRAINT aduan_jawaban_len CHECK (jawaban IS NULL OR char_length(trim(jawaban)) BETWEEN 2 AND 2000),
  CONSTRAINT aduan_kode_len CHECK (char_length(kode_lacak) = 8)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_aduan_kode_lacak ON public.aduan (kode_lacak);
CREATE INDEX IF NOT EXISTS idx_aduan_spbu_created ON public.aduan (spbu_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aduan_purge
  ON public.aduan (dijawab_at)
  WHERE dijawab_at IS NOT NULL;

-- ============================================================
-- KODE LACAK (acak, bukan sequential)
-- ============================================================

CREATE OR REPLACE FUNCTION public.gen_kode_lacak()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i int;
  tries int := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, 1 + (floor(random() * length(chars)))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.aduan WHERE kode_lacak = result);
    tries := tries + 1;
    IF tries > 20 THEN
      RAISE EXCEPTION 'Gagal membuat kode lacak';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.aduan_set_kode()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.kode_lacak IS NULL OR btrim(NEW.kode_lacak) = '' THEN
    NEW.kode_lacak := public.gen_kode_lacak();
  END IF;
  NEW.judul := btrim(NEW.judul);
  NEW.isi := btrim(NEW.isi);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aduan_set_kode ON public.aduan;
CREATE TRIGGER trg_aduan_set_kode
  BEFORE INSERT ON public.aduan
  FOR EACH ROW
  EXECUTE FUNCTION public.aduan_set_kode();

-- Petugas/admin hanya boleh isi jawaban sekali; warga tidak update
CREATE OR REPLACE FUNCTION public.aduan_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.dijawab_at IS NOT NULL THEN
    RAISE EXCEPTION 'Aduan sudah dijawab';
  END IF;
  IF NEW.jawaban IS NULL OR btrim(NEW.jawaban) = '' THEN
    RAISE EXCEPTION 'Jawaban wajib';
  END IF;
  NEW.jawaban := btrim(NEW.jawaban);
  NEW.dijawab_at := COALESCE(NEW.dijawab_at, now());
  NEW.dijawab_oleh := COALESCE(NEW.dijawab_oleh, auth.uid());
  -- Jaga field lain tidak berubah dari klien
  NEW.kode_lacak := OLD.kode_lacak;
  NEW.spbu_id := OLD.spbu_id;
  NEW.judul := OLD.judul;
  NEW.isi := OLD.isi;
  NEW.foto_path := OLD.foto_path;
  NEW.foto_url := OLD.foto_url;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aduan_guard_update ON public.aduan;
CREATE TRIGGER trg_aduan_guard_update
  BEFORE UPDATE ON public.aduan
  FOR EACH ROW
  EXECUTE FUNCTION public.aduan_guard_update();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.aduan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aduan_insert_public ON public.aduan;
CREATE POLICY aduan_insert_public ON public.aduan
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    judul IS NOT NULL
    AND isi IS NOT NULL
    AND spbu_id IS NOT NULL
    AND jawaban IS NULL
    AND dijawab_at IS NULL
    AND dijawab_oleh IS NULL
  );

DROP POLICY IF EXISTS aduan_select_petugas_admin ON public.aduan;
CREATE POLICY aduan_select_petugas_admin ON public.aduan
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_aktif()
    AND (
      public.get_my_role() = 'admin'
      OR (public.get_my_role() = 'petugas' AND spbu_id = public.get_my_spbu_id())
    )
  );

DROP POLICY IF EXISTS aduan_update_jawab ON public.aduan;
CREATE POLICY aduan_update_jawab ON public.aduan
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_aktif()
    AND dijawab_at IS NULL
    AND (
      public.get_my_role() = 'admin'
      OR (public.get_my_role() = 'petugas' AND spbu_id = public.get_my_spbu_id())
    )
  )
  WITH CHECK (
    public.get_my_aktif()
    AND (
      public.get_my_role() = 'admin'
      OR (public.get_my_role() = 'petugas' AND spbu_id = public.get_my_spbu_id())
    )
  );

-- Hapus hanya service role (purge); tidak ada policy DELETE untuk anon/authenticated

-- Kirim aduan publik: kembalikan kode tanpa buka SELECT semua baris
CREATE OR REPLACE FUNCTION public.kirim_aduan(
  p_spbu_id uuid,
  p_judul text,
  p_isi text,
  p_foto_path text DEFAULT NULL,
  p_foto_url text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kode text;
BEGIN
  IF p_spbu_id IS NULL THEN
    RAISE EXCEPTION 'SPBU wajib';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.spbu WHERE id = p_spbu_id AND aktif = true) THEN
    RAISE EXCEPTION 'SPBU tidak valid';
  END IF;

  INSERT INTO public.aduan (spbu_id, judul, isi, foto_path, foto_url)
  VALUES (p_spbu_id, p_judul, p_isi, p_foto_path, p_foto_url)
  RETURNING kode_lacak INTO v_kode;

  RETURN v_kode;
END;
$$;

REVOKE ALL ON FUNCTION public.kirim_aduan(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kirim_aduan(uuid, text, text, text, text) TO anon, authenticated;

REVOKE ALL ON TABLE public.aduan FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.aduan TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.aduan TO authenticated;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kendaraan',
  'kendaraan',
  true,
  524288,
  ARRAY['image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aduan',
  'aduan',
  true,
  524288,
  ARRAY['image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Kendaraan: petugas/admin upload
DROP POLICY IF EXISTS kendaraan_storage_insert ON storage.objects;
CREATE POLICY kendaraan_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kendaraan'
    AND public.get_my_aktif()
    AND public.get_my_role() IN ('petugas', 'admin')
  );

DROP POLICY IF EXISTS kendaraan_storage_select ON storage.objects;
CREATE POLICY kendaraan_storage_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'kendaraan');

-- Aduan: siapa pun boleh upload (form publik) + baca
DROP POLICY IF EXISTS aduan_storage_insert ON storage.objects;
CREATE POLICY aduan_storage_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'aduan');

DROP POLICY IF EXISTS aduan_storage_select ON storage.objects;
CREATE POLICY aduan_storage_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'aduan');
