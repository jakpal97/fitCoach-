-- ============================================
-- FITCOACH - SCHEMAT BAZY DANYCH
-- ============================================
-- 
-- Ten plik zawiera definicje wszystkich tabel dla aplikacji FitCoach.
-- Uruchom ten SQL w Supabase Dashboard → SQL Editor
--
-- Kolejność tabel jest ważna ze względu na foreign keys!
-- ============================================

-- Włącz rozszerzenie UUID (jeśli nie jest włączone)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES - Profile użytkowników
-- ============================================
-- Rozszerzenie danych z auth.users
-- Każdy użytkownik (klient, trener, admin) ma swój profil

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Powiązanie z auth.users
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Dane podstawowe
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    -- Rola użytkownika: client, trainer, admin
    role TEXT NOT NULL CHECK (role IN ('client', 'trainer', 'admin')) DEFAULT 'client',
    -- Opcjonalne dane
    avatar_url TEXT,
    phone TEXT,
    -- ID trenera (tylko dla klientów)
    trainer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Komentarz do tabeli
COMMENT ON TABLE profiles IS 'Profile użytkowników - rozszerzenie auth.users';
COMMENT ON COLUMN profiles.role IS 'Rola: client (klient), trainer (trener), admin (administrator)';
COMMENT ON COLUMN profiles.trainer_id IS 'ID przypisanego trenera (tylko dla klientów)';

-- ============================================
-- 2. CLIENT_DATA - Dane specyficzne dla klientów
-- ============================================
-- Dodatkowe informacje o kliencie (cel, waga, akceptacje prawne)

CREATE TABLE IF NOT EXISTS client_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Powiązanie z użytkownikiem
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Dane osobowe
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    -- Dane fizyczne
    height_cm NUMERIC(5,2) CHECK (height_cm > 0 AND height_cm < 300),
    current_weight_kg NUMERIC(5,2) CHECK (current_weight_kg > 0 AND current_weight_kg < 500),
    target_weight_kg NUMERIC(5,2) CHECK (target_weight_kg > 0 AND target_weight_kg < 500),
    -- Cele i doświadczenie
    fitness_goal TEXT,
    experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    -- Notatki zdrowotne (kontuzje, ograniczenia)
    health_notes TEXT,
    -- Akceptacje prawne (WAŻNE dla compliance!)
    accepted_terms BOOLEAN NOT NULL DEFAULT false,
    accepted_privacy BOOLEAN NOT NULL DEFAULT false,
    terms_accepted_at TIMESTAMPTZ,
    privacy_accepted_at TIMESTAMPTZ,
    -- Onboarding
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE client_data IS 'Dane specyficzne dla klientów - cele, pomiary, akceptacje prawne';
COMMENT ON COLUMN client_data.accepted_terms IS 'Czy zaakceptował regulamin - WYMAGANE przed użyciem';
COMMENT ON COLUMN client_data.accepted_privacy IS 'Czy zaakceptował politykę prywatności - WYMAGANE przed użyciem';

-- ============================================
-- 3. EXERCISES - Biblioteka ćwiczeń
-- ============================================
-- Ćwiczenia tworzone przez trenerów z filmami instruktażowymi

CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Trener który stworzył ćwiczenie
    trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Podstawowe dane
    name TEXT NOT NULL,
    -- Kategoria: strength (siłowe), cardio, stretching, core, other
    category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'stretching', 'core', 'other')),
    -- Grupy mięśniowe (tablica)
    muscle_groups TEXT[] NOT NULL DEFAULT '{}',
    -- Poziom trudności
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    -- Opisy
    description TEXT,
    -- Wskazówki wykonania (tips)
    tips TEXT,
    -- Typowy zakres powtórzeń np. "8-12", "30 sekund"
    typical_reps TEXT,
    -- Zalecany czas odpoczynku w sekundach
    rest_seconds INTEGER CHECK (rest_seconds >= 0 AND rest_seconds <= 600),
    -- Media
    video_url TEXT,
    thumbnail_url TEXT,
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE exercises IS 'Biblioteka ćwiczeń z filmami instruktażowymi';
COMMENT ON COLUMN exercises.muscle_groups IS 'Tablica grup mięśniowych: chest, back, shoulders, biceps, triceps, forearms, core, glutes, quadriceps, hamstrings, calves, full_body';
COMMENT ON COLUMN exercises.tips IS 'Wskazówki i porady dotyczące wykonania ćwiczenia';
COMMENT ON COLUMN exercises.typical_reps IS 'Typowy zakres powtórzeń np. "8-12" lub "30 sekund"';
COMMENT ON COLUMN exercises.rest_seconds IS 'Zalecany czas odpoczynku między seriami (w sekundach)';

-- ============================================
-- 4. TRAINING_PLANS - Plany treningowe
-- ============================================
-- Tygodniowe plany treningowe tworzone przez trenerów dla klientów

CREATE TABLE IF NOT EXISTS training_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Klient dla którego jest plan
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Trener który stworzył plan
    trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Zakres tygodnia
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    -- Notatki trenera
    trainer_notes TEXT,
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Constraint: week_end musi być po week_start
    CONSTRAINT valid_week_range CHECK (week_end >= week_start)
);

COMMENT ON TABLE training_plans IS 'Tygodniowe plany treningowe dla klientów';
COMMENT ON COLUMN training_plans.week_start IS 'Data rozpoczęcia tygodnia (poniedziałek)';
COMMENT ON COLUMN training_plans.week_end IS 'Data zakończenia tygodnia (niedziela)';

-- ============================================
-- 5. WORKOUT_DAYS - Dni treningowe
-- ============================================
-- Poszczególne dni w planie treningowym

CREATE TABLE IF NOT EXISTS workout_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Powiązanie z planem
    plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
    -- Dzień tygodnia (0 = poniedziałek, 6 = niedziela)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    -- Nazwa dnia np. "Dzień A - Klatka i Triceps"
    name TEXT,
    -- Czy to dzień odpoczynku
    is_rest_day BOOLEAN NOT NULL DEFAULT false,
    -- Kolejność wyświetlania
    order_index INTEGER NOT NULL DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Unikalna kombinacja plan + dzień tygodnia
    UNIQUE (plan_id, day_of_week)
);

COMMENT ON TABLE workout_days IS 'Dni treningowe w planie';
COMMENT ON COLUMN workout_days.day_of_week IS '0 = poniedziałek, 1 = wtorek, ..., 6 = niedziela';

-- ============================================
-- 6. WORKOUT_EXERCISES - Ćwiczenia w dniu treningowym
-- ============================================
-- Konkretne ćwiczenia przypisane do dnia z parametrami (serie, powtórzenia)

CREATE TABLE IF NOT EXISTS workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Powiązanie z dniem treningowym
    workout_day_id UUID NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
    -- Powiązanie z ćwiczeniem z biblioteki
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    -- Parametry treningu
    sets INTEGER NOT NULL CHECK (sets > 0 AND sets <= 20) DEFAULT 3,
    -- Powtórzenia (może być zakres np. "10-12")
    reps TEXT NOT NULL DEFAULT '10',
    -- Obciążenie w kg (opcjonalne)
    weight_kg NUMERIC(5,2) CHECK (weight_kg >= 0),
    -- Czas odpoczynku w sekundach
    rest_seconds INTEGER NOT NULL CHECK (rest_seconds >= 0 AND rest_seconds <= 600) DEFAULT 60,
    -- Notatki trenera do tego ćwiczenia
    notes TEXT,
    -- Kolejność w dniu
    order_index INTEGER NOT NULL DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE workout_exercises IS 'Ćwiczenia przypisane do dnia treningowego z parametrami';
COMMENT ON COLUMN workout_exercises.reps IS 'Powtórzenia - może być liczba "12" lub zakres "10-12"';

-- ============================================
-- 7. COMPLETED_WORKOUTS - Ukończone treningi
-- ============================================
-- Zapis wykonanych treningów przez klientów

CREATE TABLE IF NOT EXISTS completed_workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Użytkownik który wykonał trening
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Powiązanie z dniem treningowym
    workout_day_id UUID NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
    -- Data wykonania
    completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Status: completed (ukończony), partial (częściowy), skipped (pominięty)
    status TEXT NOT NULL CHECK (status IN ('completed', 'partial', 'skipped')) DEFAULT 'completed',
    -- Czas trwania w minutach
    duration_minutes INTEGER CHECK (duration_minutes > 0),
    -- Notatki klienta
    client_notes TEXT,
    -- Ocena samopoczucia (1-5)
    feeling_rating INTEGER CHECK (feeling_rating >= 1 AND feeling_rating <= 5),
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Jeden trening na dzień
    UNIQUE (user_id, workout_day_id, completed_date)
);

COMMENT ON TABLE completed_workouts IS 'Historia wykonanych treningów';
COMMENT ON COLUMN completed_workouts.status IS 'Status: completed (wszystko), partial (część), skipped (pominięty)';
COMMENT ON COLUMN completed_workouts.feeling_rating IS 'Ocena samopoczucia: 1 (źle) do 5 (świetnie)';

-- ============================================
-- 8. COMPLETED_EXERCISES - Ukończone ćwiczenia
-- ============================================
-- Szczegóły wykonanych ćwiczeń w ramach treningu

CREATE TABLE IF NOT EXISTS completed_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Powiązanie z ukończonym treningiem
    completed_workout_id UUID NOT NULL REFERENCES completed_workouts(id) ON DELETE CASCADE,
    -- Powiązanie z ćwiczeniem w planie
    workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    -- Czy wykonane
    is_completed BOOLEAN NOT NULL DEFAULT false,
    -- Faktyczne wartości (mogą różnić się od planu)
    actual_sets INTEGER CHECK (actual_sets > 0),
    actual_reps TEXT,
    actual_weight_kg NUMERIC(5,2) CHECK (actual_weight_kg >= 0),
    -- Notatki
    notes TEXT,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Jedno ćwiczenie raz na trening
    UNIQUE (completed_workout_id, workout_exercise_id)
);

COMMENT ON TABLE completed_exercises IS 'Szczegóły wykonanych ćwiczeń';

-- ============================================
-- 9. MEASUREMENTS - Pomiary
-- ============================================
-- Pomiary wagi i obwodów ciała

CREATE TABLE IF NOT EXISTS measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Użytkownik
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Data pomiaru
    measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Waga
    weight_kg NUMERIC(5,2) CHECK (weight_kg > 0 AND weight_kg < 500),
    -- Procent tkanki tłuszczowej
    body_fat_percentage NUMERIC(4,1) CHECK (body_fat_percentage >= 0 AND body_fat_percentage <= 100),
    -- Obwody ciała (w cm)
    waist_cm NUMERIC(5,2) CHECK (waist_cm > 0),
    chest_cm NUMERIC(5,2) CHECK (chest_cm > 0),
    arm_cm NUMERIC(5,2) CHECK (arm_cm > 0),
    thigh_cm NUMERIC(5,2) CHECK (thigh_cm > 0),
    -- Notatki
    notes TEXT,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Jeden pomiar na dzień
    UNIQUE (user_id, measurement_date)
);

COMMENT ON TABLE measurements IS 'Pomiary wagi i obwodów ciała';

-- ============================================
-- 10. PROGRESS_PHOTOS - Zdjęcia postępu
-- ============================================
-- Zdjęcia dokumentujące postępy (przód, bok, tył)

CREATE TABLE IF NOT EXISTS progress_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Powiązanie z pomiarem
    measurement_id UUID NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
    -- URL zdjęcia w Storage
    photo_url TEXT NOT NULL,
    -- Typ zdjęcia: front (przód), side (bok), back (tył)
    photo_type TEXT NOT NULL CHECK (photo_type IN ('front', 'side', 'back')),
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE progress_photos IS 'Zdjęcia postępu powiązane z pomiarami';
COMMENT ON COLUMN progress_photos.photo_type IS 'Typ: front (przód), side (bok), back (tył)';

-- ============================================
-- 11. DIET_PLANS - Plany dietetyczne
-- ============================================
-- Plany żywieniowe dla klientów (PDF lub opis)

CREATE TABLE IF NOT EXISTS diet_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Klient
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Trener
    trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Dane planu
    title TEXT NOT NULL,
    description TEXT,
    -- URL do pliku PDF w Storage
    file_url TEXT,
    -- Okres obowiązywania
    start_date DATE,
    end_date DATE,
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Constraint: end_date po start_date
    CONSTRAINT valid_diet_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE diet_plans IS 'Plany dietetyczne dla klientów';

-- ============================================
-- 12. MESSAGES - Wiadomości (Chat)
-- ============================================
-- Wiadomości między trenerem a klientem

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Nadawca
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Odbiorca
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Treść wiadomości
    content TEXT NOT NULL,
    -- Status przeczytania
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Nadawca nie może być odbiorcą
    CONSTRAINT different_sender_receiver CHECK (sender_id != receiver_id)
);

COMMENT ON TABLE messages IS 'Wiadomości w czacie między trenerem a klientem';

-- ============================================
-- 13. NOTIFICATION_TOKENS - Tokeny powiadomień push
-- ============================================
-- Tokeny Expo Push dla powiadomień mobilnych

CREATE TABLE IF NOT EXISTS notification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Użytkownik
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Token Expo Push
    expo_push_token TEXT NOT NULL,
    -- Platforma
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Jeden token na użytkownika (na urządzenie)
    UNIQUE (user_id, expo_push_token)
);

COMMENT ON TABLE notification_tokens IS 'Tokeny Expo Push do powiadomień mobilnych';

-- ============================================
-- 14. NOTIFICATIONS - Powiadomienia
-- ============================================
-- Historia powiadomień dla użytkowników

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Użytkownik
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Typ powiadomienia
    type TEXT NOT NULL CHECK (type IN ('new_plan', 'workout_reminder', 'new_message', 'progress_update', 'trainer_feedback')),
    -- Treść
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    -- Dodatkowe dane (JSON)
    data JSONB,
    -- Status
    is_read BOOLEAN NOT NULL DEFAULT false,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'Historia powiadomień';
COMMENT ON COLUMN notifications.type IS 'Typ: new_plan, workout_reminder, new_message, progress_update, trainer_feedback';

-- ============================================
-- FUNKCJA: Automatyczna aktualizacja updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TRIGGERY: Auto-update updated_at
-- ============================================

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_data_updated_at
    BEFORE UPDATE ON client_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_plans_updated_at
    BEFORE UPDATE ON training_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_measurements_updated_at
    BEFORE UPDATE ON measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diet_plans_updated_at
    BEFORE UPDATE ON diet_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_tokens_updated_at
    BEFORE UPDATE ON notification_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEKSY DLA WYDAJNOŚCI
-- ============================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_trainer_id ON profiles(trainer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Client Data
CREATE INDEX IF NOT EXISTS idx_client_data_user_id ON client_data(user_id);

-- Exercises
CREATE INDEX IF NOT EXISTS idx_exercises_trainer_id ON exercises(trainer_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);

-- Training Plans
CREATE INDEX IF NOT EXISTS idx_training_plans_client_id ON training_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_trainer_id ON training_plans(trainer_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_week_start ON training_plans(week_start);

-- Workout Days
CREATE INDEX IF NOT EXISTS idx_workout_days_plan_id ON workout_days(plan_id);

-- Workout Exercises
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_day_id ON workout_exercises(workout_day_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);

-- Completed Workouts
CREATE INDEX IF NOT EXISTS idx_completed_workouts_user_id ON completed_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_completed_workouts_completed_date ON completed_workouts(completed_date);

-- Completed Exercises
CREATE INDEX IF NOT EXISTS idx_completed_exercises_completed_workout_id ON completed_exercises(completed_workout_id);

-- Measurements
CREATE INDEX IF NOT EXISTS idx_measurements_user_id ON measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_measurements_date ON measurements(measurement_date);

-- Progress Photos
CREATE INDEX IF NOT EXISTS idx_progress_photos_measurement_id ON progress_photos(measurement_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- KONIEC SCHEMATU
-- ============================================
-- 
-- Po uruchomieniu tego SQL sprawdź:
-- 1. Supabase Dashboard → Table Editor - czy widzisz wszystkie 14 tabel
-- 2. Każda tabela powinna mieć odpowiednie kolumny
-- 
-- Następny krok: rls-policies.sql (Row Level Security)
-- ============================================

