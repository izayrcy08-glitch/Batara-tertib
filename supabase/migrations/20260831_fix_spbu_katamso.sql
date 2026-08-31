-- Ganti SPBU LANJAS (tidak ada) → KM 02 JL BRIGJEN KATAMSO

UPDATE public.spbu
SET nama = 'SPBU KM 02 JL BRIGJEN KATAMSO'
WHERE id = 'a0000000-0000-0000-0000-000000000005';

UPDATE public.profiles
SET nama = 'Petugas KM 02 Jl Brigjen Katamso'
WHERE spbu_id = 'a0000000-0000-0000-0000-000000000005'
  AND role = 'petugas';
