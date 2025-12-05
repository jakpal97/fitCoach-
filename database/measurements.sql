-- ============================================
-- TABELA POMIARÓW (measurements)
-- ============================================
-- Przechowuje pomiary ciała klientów (waga, obwody, tkanka tłuszczowa)

CREATE TABLE IF NOT EXISTS measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Podstawowe
    weight_kg DECIMAL(5,2),
    body_fat_percent DECIMAL(4,1),
    
    -- Obwody (cm)
    chest_cm DECIMAL(5,1),
    waist_cm DECIMAL(5,1),
    hips_cm DECIMAL(5,1),
    biceps_left_cm DECIMAL(4,1),
    biceps_right_cm DECIMAL(4,1),
    thigh_left_cm DECIMAL(5,1),
    thigh_right_cm DECIMAL(5,1),
    calf_left_cm DECIMAL(4,1),
    calf_right_cm DECIMAL(4,1),
    
    -- Notatki
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: przynajmniej jeden pomiar musi być wprowadzony
    CONSTRAINT at_least_one_measurement CHECK (
        weight_kg IS NOT NULL OR
        body_fat_percent IS NOT NULL OR
        chest_cm IS NOT NULL OR
        waist_cm IS NOT NULL OR
        hips_cm IS NOT NULL OR
        biceps_left_cm IS NOT NULL OR
        biceps_right_cm IS NOT NULL OR
        thigh_left_cm IS NOT NULL OR
        thigh_right_cm IS NOT NULL OR
        calf_left_cm IS NOT NULL OR
        calf_right_cm IS NOT NULL
    )
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_measurements_user_id ON measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_measurements_date ON measurements(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_user_date ON measurements(user_id, measurement_date DESC);

-- Trigger dla updated_at
CREATE OR REPLACE FUNCTION update_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_measurements_updated_at ON measurements;
CREATE TRIGGER trigger_measurements_updated_at
    BEFORE UPDATE ON measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_measurements_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

-- Klienci mogą odczytywać swoje pomiary
CREATE POLICY "Users can read own measurements"
    ON measurements
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Klienci mogą dodawać swoje pomiary
CREATE POLICY "Users can insert own measurements"
    ON measurements
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Klienci mogą aktualizować swoje pomiary
CREATE POLICY "Users can update own measurements"
    ON measurements
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Klienci mogą usuwać swoje pomiary
CREATE POLICY "Users can delete own measurements"
    ON measurements
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Trenerzy mogą odczytywać pomiary swoich klientów
CREATE POLICY "Trainers can read client measurements"
    ON measurements
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = measurements.user_id
            AND profiles.trainer_id = (
                SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'trainer'
            )
        )
    );

-- ============================================
-- INSTRUKCJA
-- ============================================
-- Aby uruchomić ten skrypt:
-- 1. Otwórz Supabase Dashboard
-- 2. Przejdź do SQL Editor
-- 3. Wklej i uruchom ten kod

