-- ============================================
-- AKTUALIZACJA TABELI MEASUREMENTS
-- ============================================
-- Dodaje brakujące kolumny do tabeli measurements
-- Uruchom w Supabase Dashboard → SQL Editor

-- 1. Zmień nazwę kolumny body_fat_percentage na body_fat_percent
ALTER TABLE measurements 
RENAME COLUMN body_fat_percentage TO body_fat_percent;

-- 2. Dodaj brakujące kolumny dla obwodów
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS hips_cm DECIMAL(5,1);

ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS biceps_left_cm DECIMAL(4,1);

ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS biceps_right_cm DECIMAL(4,1);

ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS thigh_left_cm DECIMAL(5,1);

ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS thigh_right_cm DECIMAL(5,1);

ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS calf_left_cm DECIMAL(4,1);

ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS calf_right_cm DECIMAL(4,1);

-- 3. Migracja starych danych (opcjonalne)
-- Jeśli masz dane w arm_cm, skopiuj do biceps_left_cm i biceps_right_cm
UPDATE measurements 
SET biceps_left_cm = arm_cm, biceps_right_cm = arm_cm 
WHERE arm_cm IS NOT NULL AND biceps_left_cm IS NULL;

-- Jeśli masz dane w thigh_cm, skopiuj do thigh_left_cm i thigh_right_cm  
UPDATE measurements 
SET thigh_left_cm = thigh_cm, thigh_right_cm = thigh_cm 
WHERE thigh_cm IS NOT NULL AND thigh_left_cm IS NULL;

-- 4. (Opcjonalne) Usuń stare kolumny po migracji
-- UWAGA: Odkomentuj tylko jeśli dane zostały zmigrowane!
-- ALTER TABLE measurements DROP COLUMN IF EXISTS arm_cm;
-- ALTER TABLE measurements DROP COLUMN IF EXISTS thigh_cm;

-- ============================================
-- GOTOWE!
-- ============================================

