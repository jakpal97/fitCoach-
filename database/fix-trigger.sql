-- ============================================
-- NAPRAWA TRIGGERA handle_new_user
-- ============================================
-- 
-- Uruchom ten SQL w Supabase Dashboard → SQL Editor
-- Ten skrypt naprawi trigger tworzący profil po rejestracji
-- ============================================

-- Najpierw usuń stary trigger i funkcję
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Utwórz naprawioną funkcję
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Utwórz profil dla nowego użytkownika
    INSERT INTO public.profiles (
        user_id,
        email,
        first_name,
        last_name,
        role,
        is_active
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Nowy'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'Użytkownik'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
        true
    );
    
    -- Jeśli to klient, utwórz też client_data
    IF COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'client' THEN
        INSERT INTO public.client_data (user_id)
        VALUES (NEW.id);
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Loguj błąd ale nie blokuj tworzenia użytkownika
        RAISE WARNING 'Błąd tworzenia profilu dla użytkownika %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Utwórz trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Nadaj uprawnienia
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- ============================================
-- ALTERNATYWNE ROZWIĄZANIE:
-- Jeśli trigger nadal nie działa, możesz wyłączyć
-- automatyczne tworzenie profilu i robić to ręcznie
-- ============================================

-- Aby wyłączyć trigger (opcjonalnie):
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- TEST: Utwórz profil ręcznie dla istniejącego usera
-- ============================================
-- Jeśli masz już użytkownika bez profilu, uruchom:
--
-- INSERT INTO profiles (user_id, email, first_name, last_name, role)
-- SELECT id, email, 'Test', 'User', 'client'
-- FROM auth.users
-- WHERE id NOT IN (SELECT user_id FROM profiles);
--
-- INSERT INTO client_data (user_id)
-- SELECT id FROM auth.users
-- WHERE id NOT IN (SELECT user_id FROM client_data);
-- ============================================

