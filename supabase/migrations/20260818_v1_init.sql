-- V1 Initial Schema — Batara Tertib
-- Jalankan di Supabase Dashboard > SQL Editor

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'petugas');

CREATE TYPE produk_bbm AS ENUM (
  'Pertalite', 'Pertamax', 'Pertamax Turbo', 'Solar', 'Dexlite'
);

CREATE TYPE alasan_tolak AS ENUM (
  'isi_ulang_hari_ini', 'stnk_tidak_cocok', 'lainnya'
);

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE spbu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  spbu_id uuid REFERENCES spbu,
  role user_role NOT NULL DEFAULT 'petugas',
  nama text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE kendaraan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plat_lengkap text NOT NULL UNIQUE,
  angka_plat text NOT NULL,
  foto_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transaksi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kendaraan_id uuid NOT NULL REFERENCES kendaraan,
  spbu_id uuid NOT NULL REFERENCES spbu,
  user_id uuid NOT NULL REFERENCES auth.users,
  liter integer NOT NULL CHECK (liter > 0),
  produk produk_bbm NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tolakan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kendaraan_id uuid NOT NULL REFERENCES kendaraan,
  spbu_id uuid NOT NULL REFERENCES spbu,
  user_id uuid NOT NULL REFERENCES auth.users,
  alasan alasan_tolak NOT NULL,
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- 1 plat = 1 isi sukses per hari kalender WIB
CREATE UNIQUE INDEX idx_satu_isi_per_hari
  ON transaksi (kendaraan_id, ((created_at AT TIME ZONE 'Asia/Jakarta')::date));

CREATE INDEX idx_kendaraan_angka ON kendaraan (angka_plat);
CREATE INDEX idx_kendaraan_plat ON kendaraan (plat_lengkap);
CREATE INDEX idx_transaksi_waktu ON transaksi (created_at DESC);
CREATE INDEX idx_transaksi_kendaraan ON transaksi (kendaraan_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE spbu ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kendaraan ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE tolakan ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper: get current user's spbu_id
CREATE OR REPLACE FUNCTION public.get_my_spbu_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT spbu_id FROM public.profiles WHERE id = auth.uid();
$$;

-- SPBU: everyone can read active, admin can write
CREATE POLICY "spbu_select" ON spbu FOR SELECT USING (true);
CREATE POLICY "spbu_admin" ON spbu FOR ALL USING (public.get_my_role() = 'admin');

-- Profiles: user reads own, admin reads all
CREATE POLICY "profiles_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_admin" ON profiles FOR ALL USING (public.get_my_role() = 'admin');

-- Kendaraan: semua petugas bisa lihat dan daftar baru (milik jaringan)
CREATE POLICY "kendaraan_select" ON kendaraan FOR SELECT USING (true);
CREATE POLICY "kendaraan_insert" ON kendaraan FOR INSERT WITH CHECK (true);

-- Transaksi: petugas insert di SPBU sendiri, select semua (untuk riwayat lintas pompa)
CREATE POLICY "transaksi_select" ON transaksi FOR SELECT USING (true);
CREATE POLICY "transaksi_insert" ON transaksi FOR INSERT
  WITH CHECK (spbu_id = public.get_my_spbu_id() AND user_id = auth.uid());

-- Tolakan: same pattern
CREATE POLICY "tolakan_select" ON tolakan FOR SELECT USING (true);
CREATE POLICY "tolakan_insert" ON tolakan FOR INSERT
  WITH CHECK (spbu_id = public.get_my_spbu_id() AND user_id = auth.uid());

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, role, spbu_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nama', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'petugas'),
    (NEW.raw_user_meta_data ->> 'spbu_id')::uuid
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SEED: 5 SPBU Muara Teweh
-- ============================================================

INSERT INTO spbu (id, nama) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'SPBU PERUSDA'),
  ('a0000000-0000-0000-0000-000000000002', 'SPBU JL PENDREH'),
  ('a0000000-0000-0000-0000-000000000003', 'SPBU JL PRAMUKA'),
  ('a0000000-0000-0000-0000-000000000004', 'SPBU JINGAH'),
  ('a0000000-0000-0000-0000-000000000005', 'SPBU LANJAS');
