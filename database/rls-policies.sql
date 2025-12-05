-- ============================================
-- FITCOACH - ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- 
-- Ten plik zawiera polityki bezpieczeństwa dla wszystkich tabel.
-- Uruchom AFTER schema.sql w Supabase Dashboard → SQL Editor
--
-- WAŻNE: RLS zapewnia, że użytkownicy widzą tylko swoje dane!
-- ============================================

-- ============================================
-- WŁĄCZENIE RLS DLA WSZYSTKICH TABEL
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNKCJE POMOCNICZE
-- ============================================

-- Funkcja: Pobierz rolę aktualnego użytkownika
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role FROM profiles 
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja: Sprawdź czy użytkownik jest trenerem danego klienta
CREATE OR REPLACE FUNCTION is_trainer_of(client_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = client_user_id 
        AND trainer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja: Pobierz ID profilu aktualnego użytkownika
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM profiles 
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 1. PROFILES - Polityki
-- ============================================

-- Użytkownicy widzą swój profil
CREATE POLICY "Użytkownicy widzą swój profil"
ON profiles FOR SELECT
USING (user_id = auth.uid());

-- Trenerzy widzą profile swoich klientów
CREATE POLICY "Trenerzy widzą profile klientów"
ON profiles FOR SELECT
USING (
    trainer_id = get_current_profile_id()
);

-- Admini widzą wszystkie profile
CREATE POLICY "Admini widzą wszystkie profile"
ON profiles FOR SELECT
USING (
    get_user_role() = 'admin'
);

-- Użytkownicy mogą aktualizować swój profil
CREATE POLICY "Użytkownicy aktualizują swój profil"
ON profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Nowe profile tworzone przez system (trigger po rejestracji)
CREATE POLICY "System tworzy profile"
ON profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 2. CLIENT_DATA - Polityki
-- ============================================

-- Klienci widzą swoje dane
CREATE POLICY "Klienci widzą swoje dane"
ON client_data FOR SELECT
USING (user_id = auth.uid());

-- Trenerzy widzą dane swoich klientów
CREATE POLICY "Trenerzy widzą dane klientów"
ON client_data FOR SELECT
USING (
    is_trainer_of(user_id)
);

-- Klienci mogą aktualizować swoje dane
CREATE POLICY "Klienci aktualizują swoje dane"
ON client_data FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Klienci mogą tworzyć swoje dane
CREATE POLICY "Klienci tworzą swoje dane"
ON client_data FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 3. EXERCISES - Polityki
-- ============================================

-- Trenerzy widzą swoje ćwiczenia
CREATE POLICY "Trenerzy widzą swoje ćwiczenia"
ON exercises FOR SELECT
USING (
    trainer_id = get_current_profile_id()
);

-- Klienci widzą ćwiczenia w swoich planach
CREATE POLICY "Klienci widzą ćwiczenia w planach"
ON exercises FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM workout_exercises we
        JOIN workout_days wd ON we.workout_day_id = wd.id
        JOIN training_plans tp ON wd.plan_id = tp.id
        JOIN profiles p ON tp.client_id = p.id
        WHERE we.exercise_id = exercises.id
        AND p.user_id = auth.uid()
    )
);

-- Trenerzy mogą tworzyć ćwiczenia
CREATE POLICY "Trenerzy tworzą ćwiczenia"
ON exercises FOR INSERT
WITH CHECK (
    get_user_role() = 'trainer'
    AND trainer_id = get_current_profile_id()
);

-- Trenerzy mogą aktualizować swoje ćwiczenia
CREATE POLICY "Trenerzy aktualizują swoje ćwiczenia"
ON exercises FOR UPDATE
USING (trainer_id = get_current_profile_id())
WITH CHECK (trainer_id = get_current_profile_id());

-- Trenerzy mogą usuwać swoje ćwiczenia
CREATE POLICY "Trenerzy usuwają swoje ćwiczenia"
ON exercises FOR DELETE
USING (trainer_id = get_current_profile_id());

-- ============================================
-- 4. TRAINING_PLANS - Polityki
-- ============================================

-- Klienci widzą swoje plany
CREATE POLICY "Klienci widzą swoje plany"
ON training_plans FOR SELECT
USING (
    client_id = get_current_profile_id()
);

-- Trenerzy widzą plany swoich klientów
CREATE POLICY "Trenerzy widzą plany klientów"
ON training_plans FOR SELECT
USING (
    trainer_id = get_current_profile_id()
);

-- Trenerzy mogą tworzyć plany dla klientów
CREATE POLICY "Trenerzy tworzą plany"
ON training_plans FOR INSERT
WITH CHECK (
    get_user_role() = 'trainer'
    AND trainer_id = get_current_profile_id()
);

-- Trenerzy mogą aktualizować plany
CREATE POLICY "Trenerzy aktualizują plany"
ON training_plans FOR UPDATE
USING (trainer_id = get_current_profile_id())
WITH CHECK (trainer_id = get_current_profile_id());

-- Trenerzy mogą usuwać plany
CREATE POLICY "Trenerzy usuwają plany"
ON training_plans FOR DELETE
USING (trainer_id = get_current_profile_id());

-- ============================================
-- 5. WORKOUT_DAYS - Polityki
-- ============================================

-- Klienci widzą dni ze swoich planów
CREATE POLICY "Klienci widzą swoje dni treningowe"
ON workout_days FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM training_plans tp
        WHERE tp.id = workout_days.plan_id
        AND tp.client_id = get_current_profile_id()
    )
);

-- Trenerzy widzą dni w planach które stworzyli
CREATE POLICY "Trenerzy widzą dni treningowe"
ON workout_days FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM training_plans tp
        WHERE tp.id = workout_days.plan_id
        AND tp.trainer_id = get_current_profile_id()
    )
);

-- Trenerzy mogą CRUD na dniach treningowych
CREATE POLICY "Trenerzy zarządzają dniami"
ON workout_days FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM training_plans tp
        WHERE tp.id = workout_days.plan_id
        AND tp.trainer_id = get_current_profile_id()
    )
);

-- ============================================
-- 6. WORKOUT_EXERCISES - Polityki
-- ============================================

-- Klienci widzą ćwiczenia ze swoich planów
CREATE POLICY "Klienci widzą ćwiczenia w planach"
ON workout_exercises FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM workout_days wd
        JOIN training_plans tp ON wd.plan_id = tp.id
        WHERE wd.id = workout_exercises.workout_day_id
        AND tp.client_id = get_current_profile_id()
    )
);

-- Trenerzy widzą ćwiczenia w swoich planach
CREATE POLICY "Trenerzy widzą ćwiczenia w planach"
ON workout_exercises FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM workout_days wd
        JOIN training_plans tp ON wd.plan_id = tp.id
        WHERE wd.id = workout_exercises.workout_day_id
        AND tp.trainer_id = get_current_profile_id()
    )
);

-- Trenerzy mogą zarządzać ćwiczeniami w planach
CREATE POLICY "Trenerzy zarządzają ćwiczeniami w planach"
ON workout_exercises FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM workout_days wd
        JOIN training_plans tp ON wd.plan_id = tp.id
        WHERE wd.id = workout_exercises.workout_day_id
        AND tp.trainer_id = get_current_profile_id()
    )
);

-- ============================================
-- 7. COMPLETED_WORKOUTS - Polityki
-- ============================================

-- Użytkownicy widzą swoje ukończone treningi
CREATE POLICY "Użytkownicy widzą swoje ukończone treningi"
ON completed_workouts FOR SELECT
USING (user_id = auth.uid());

-- Trenerzy widzą ukończone treningi klientów
CREATE POLICY "Trenerzy widzą ukończone treningi klientów"
ON completed_workouts FOR SELECT
USING (
    is_trainer_of(user_id)
);

-- Użytkownicy mogą tworzyć swoje ukończone treningi
CREATE POLICY "Użytkownicy tworzą ukończone treningi"
ON completed_workouts FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Użytkownicy mogą aktualizować swoje ukończone treningi
CREATE POLICY "Użytkownicy aktualizują ukończone treningi"
ON completed_workouts FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 8. COMPLETED_EXERCISES - Polityki
-- ============================================

-- Użytkownicy widzą swoje ukończone ćwiczenia
CREATE POLICY "Użytkownicy widzą swoje ukończone ćwiczenia"
ON completed_exercises FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM completed_workouts cw
        WHERE cw.id = completed_exercises.completed_workout_id
        AND cw.user_id = auth.uid()
    )
);

-- Trenerzy widzą ukończone ćwiczenia klientów
CREATE POLICY "Trenerzy widzą ukończone ćwiczenia klientów"
ON completed_exercises FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM completed_workouts cw
        WHERE cw.id = completed_exercises.completed_workout_id
        AND is_trainer_of(cw.user_id)
    )
);

-- Użytkownicy mogą zarządzać swoimi ukończonymi ćwiczeniami
CREATE POLICY "Użytkownicy zarządzają ukończonymi ćwiczeniami"
ON completed_exercises FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM completed_workouts cw
        WHERE cw.id = completed_exercises.completed_workout_id
        AND cw.user_id = auth.uid()
    )
);

-- ============================================
-- 9. MEASUREMENTS - Polityki
-- ============================================

-- Użytkownicy widzą swoje pomiary
CREATE POLICY "Użytkownicy widzą swoje pomiary"
ON measurements FOR SELECT
USING (user_id = auth.uid());

-- Trenerzy widzą pomiary klientów
CREATE POLICY "Trenerzy widzą pomiary klientów"
ON measurements FOR SELECT
USING (
    is_trainer_of(user_id)
);

-- Użytkownicy mogą CRUD na swoich pomiarach
CREATE POLICY "Użytkownicy zarządzają pomiarami"
ON measurements FOR ALL
USING (user_id = auth.uid());

-- ============================================
-- 10. PROGRESS_PHOTOS - Polityki
-- ============================================

-- Użytkownicy widzą swoje zdjęcia
CREATE POLICY "Użytkownicy widzą swoje zdjęcia"
ON progress_photos FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM measurements m
        WHERE m.id = progress_photos.measurement_id
        AND m.user_id = auth.uid()
    )
);

-- Trenerzy widzą zdjęcia klientów
CREATE POLICY "Trenerzy widzą zdjęcia klientów"
ON progress_photos FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM measurements m
        WHERE m.id = progress_photos.measurement_id
        AND is_trainer_of(m.user_id)
    )
);

-- Użytkownicy mogą zarządzać swoimi zdjęciami
CREATE POLICY "Użytkownicy zarządzają zdjęciami"
ON progress_photos FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM measurements m
        WHERE m.id = progress_photos.measurement_id
        AND m.user_id = auth.uid()
    )
);

-- ============================================
-- 11. DIET_PLANS - Polityki
-- ============================================

-- Klienci widzą swoje plany dietetyczne
CREATE POLICY "Klienci widzą swoje plany dietetyczne"
ON diet_plans FOR SELECT
USING (
    client_id = get_current_profile_id()
);

-- Trenerzy widzą plany dietetyczne klientów
CREATE POLICY "Trenerzy widzą plany dietetyczne"
ON diet_plans FOR SELECT
USING (
    trainer_id = get_current_profile_id()
);

-- Trenerzy mogą zarządzać planami dietetycznymi
CREATE POLICY "Trenerzy zarządzają planami dietetycznymi"
ON diet_plans FOR ALL
USING (
    trainer_id = get_current_profile_id()
);

-- ============================================
-- 12. MESSAGES - Polityki
-- ============================================

-- Użytkownicy widzą wiadomości gdzie są nadawcą lub odbiorcą
CREATE POLICY "Użytkownicy widzą swoje wiadomości"
ON messages FOR SELECT
USING (
    sender_id = get_current_profile_id()
    OR receiver_id = get_current_profile_id()
);

-- Użytkownicy mogą wysyłać wiadomości
CREATE POLICY "Użytkownicy wysyłają wiadomości"
ON messages FOR INSERT
WITH CHECK (
    sender_id = get_current_profile_id()
);

-- Odbiorcy mogą aktualizować status przeczytania
CREATE POLICY "Odbiorcy aktualizują status wiadomości"
ON messages FOR UPDATE
USING (
    receiver_id = get_current_profile_id()
)
WITH CHECK (
    receiver_id = get_current_profile_id()
);

-- ============================================
-- 13. NOTIFICATION_TOKENS - Polityki
-- ============================================

-- Użytkownicy widzą swoje tokeny
CREATE POLICY "Użytkownicy widzą swoje tokeny"
ON notification_tokens FOR SELECT
USING (user_id = auth.uid());

-- Użytkownicy mogą zarządzać swoimi tokenami
CREATE POLICY "Użytkownicy zarządzają tokenami"
ON notification_tokens FOR ALL
USING (user_id = auth.uid());

-- ============================================
-- 14. NOTIFICATIONS - Polityki
-- ============================================

-- Użytkownicy widzą swoje powiadomienia
CREATE POLICY "Użytkownicy widzą swoje powiadomienia"
ON notifications FOR SELECT
USING (user_id = auth.uid());

-- System może tworzyć powiadomienia (przez funkcję)
CREATE POLICY "System tworzy powiadomienia"
ON notifications FOR INSERT
WITH CHECK (true);  -- Kontrolowane przez funkcje serwera

-- Użytkownicy mogą aktualizować status przeczytania
CREATE POLICY "Użytkownicy aktualizują powiadomienia"
ON notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- TRIGGER: Auto-tworzenie profilu po rejestracji
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Nowy'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'Użytkownik'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'client')
    );
    
    -- Jeśli to klient, utwórz też client_data
    IF COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'client' THEN
        INSERT INTO client_data (user_id)
        VALUES (NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger na auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- KONIEC POLITYK RLS
-- ============================================
-- 
-- Po uruchomieniu tego SQL sprawdź:
-- 1. Supabase Dashboard → Authentication → Policies
-- 2. Każda tabela powinna mieć kilka polityk
-- 
-- Następny krok: storage-setup.sql (Buckets dla plików)
-- ============================================

