-- V1 Admin — jalankan di Supabase Dashboard > SQL Editor
-- profiles.email/aktif, RLS admin, RPC rekap_bbm, max 2 petugas

-- ============================================================
-- COLUMNS
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS aktif boolean NOT NULL DEFAULT true;

UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles (email)
  WHERE email IS NOT NULL;

-- ============================================================
-- HELPERS (search_path pinned)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_spbu_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT spbu_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_aktif()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT aktif FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- ============================================================
-- SIGNUP TRIGGER: isi email
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, role, spbu_id, email, aktif)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nama', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'petugas'),
    (NEW.raw_user_meta_data ->> 'spbu_id')::uuid,
    NEW.email,
    true
  );
  RETURN NEW;
END;
$$;

-- ============================================================
-- MAX 2 PETUGAS AKTIF PER SPBU
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_max_petugas()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'petugas' AND NEW.spbu_id IS NULL THEN
    RAISE EXCEPTION 'Petugas wajib terikat SPBU';
  END IF;

  IF NEW.role = 'petugas' AND NEW.aktif IS TRUE THEN
    IF (
      SELECT count(*) FROM public.profiles
      WHERE spbu_id = NEW.spbu_id
        AND role = 'petugas'
        AND aktif = true
        AND id IS DISTINCT FROM NEW.id
    ) >= 2 THEN
      RAISE EXCEPTION 'Max 2 petugas aktif per SPBU';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_petugas ON profiles;
CREATE TRIGGER trg_enforce_max_petugas
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_petugas();

-- Profiles: user baca sendiri, admin baca semua. Mutasi user hanya lewat Edge Function (service role).
DROP POLICY IF EXISTS profiles_own ON profiles;
DROP POLICY IF EXISTS profiles_admin ON profiles;
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_select_admin ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS kendaraan_select ON kendaraan;
DROP POLICY IF EXISTS kendaraan_insert ON kendaraan;
DROP POLICY IF EXISTS kendaraan_admin_update ON kendaraan;
DROP POLICY IF EXISTS kendaraan_admin_delete ON kendaraan;
CREATE POLICY kendaraan_select ON kendaraan
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY kendaraan_insert ON kendaraan
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_aktif());
CREATE POLICY kendaraan_admin_update ON kendaraan
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY kendaraan_admin_delete ON kendaraan
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS transaksi_select ON transaksi;
DROP POLICY IF EXISTS transaksi_insert ON transaksi;
DROP POLICY IF EXISTS transaksi_admin_update ON transaksi;
DROP POLICY IF EXISTS transaksi_admin_delete ON transaksi;
CREATE POLICY transaksi_select ON transaksi
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY transaksi_insert ON transaksi
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_aktif()
    AND spbu_id = public.get_my_spbu_id()
    AND user_id = auth.uid()
  );
CREATE POLICY transaksi_admin_update ON transaksi
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY transaksi_admin_delete ON transaksi
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS tolakan_select ON tolakan;
DROP POLICY IF EXISTS tolakan_insert ON tolakan;
DROP POLICY IF EXISTS tolakan_admin_update ON tolakan;
DROP POLICY IF EXISTS tolakan_admin_delete ON tolakan;
CREATE POLICY tolakan_select ON tolakan
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY tolakan_insert ON tolakan
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_aktif()
    AND spbu_id = public.get_my_spbu_id()
    AND user_id = auth.uid()
  );
CREATE POLICY tolakan_admin_update ON tolakan
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY tolakan_admin_delete ON tolakan
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ============================================================
-- RPC publik: total liter, tanpa plat / petugas
-- ============================================================

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
