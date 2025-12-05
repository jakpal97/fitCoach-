-- ============================================
-- FITCOACH - STORAGE BUCKETS SETUP
-- ============================================
-- 
-- Ten plik zawiera konfigurację Storage buckets.
-- 
-- ⚠️ UWAGA: Buckety należy utworzyć RĘCZNIE w Supabase Dashboard!
-- Ten SQL tworzy tylko POLITYKI dostępu do bucketów.
--
-- INSTRUKCJA:
-- 1. Najpierw utwórz buckety w Dashboard → Storage
-- 2. Potem uruchom ten SQL dla polityk
-- ============================================

-- ============================================
-- BUCKETY DO UTWORZENIA RĘCZNIE:
-- ============================================
--
-- 1. exercise-videos (PUBLIC)
--    - Filmy instruktażowe do ćwiczeń
--    - Publiczne, bo klienci muszą je oglądać
--
-- 2. progress-photos (PRIVATE)
--    - Zdjęcia postępu klientów
--    - Prywatne! Tylko właściciel i trener
--
-- 3. diet-files (PRIVATE)
--    - Pliki PDF z dietami
--    - Prywatne! Tylko klient i trener
--
-- ============================================

-- ============================================
-- 1. EXERCISE-VIDEOS - Polityki
-- ============================================
-- Bucket: exercise-videos (PUBLIC)
-- Trenerzy mogą uploadować, wszyscy mogą oglądać

-- Każdy może oglądać filmy ćwiczeń (bucket jest public)
CREATE POLICY "Publiczny dostęp do filmów ćwiczeń"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-videos');

-- Trenerzy mogą uploadować filmy
CREATE POLICY "Trenerzy uploadują filmy ćwiczeń"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'exercise-videos'
    AND (
        SELECT role FROM profiles 
        WHERE user_id = auth.uid()
    ) = 'trainer'
);

-- Trenerzy mogą aktualizować swoje filmy
CREATE POLICY "Trenerzy aktualizują filmy ćwiczeń"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'exercise-videos'
    AND (
        SELECT role FROM profiles 
        WHERE user_id = auth.uid()
    ) = 'trainer'
);

-- Trenerzy mogą usuwać swoje filmy
CREATE POLICY "Trenerzy usuwają filmy ćwiczeń"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'exercise-videos'
    AND (
        SELECT role FROM profiles 
        WHERE user_id = auth.uid()
    ) = 'trainer'
);

-- ============================================
-- 2. PROGRESS-PHOTOS - Polityki
-- ============================================
-- Bucket: progress-photos (PRIVATE)
-- Użytkownicy uploadują swoje, trenerzy widzą klientów

-- Użytkownicy widzą swoje zdjęcia
CREATE POLICY "Użytkownicy widzą swoje zdjęcia postępu"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Trenerzy widzą zdjęcia swoich klientów
CREATE POLICY "Trenerzy widzą zdjęcia klientów"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'progress-photos'
    AND EXISTS (
        SELECT 1 FROM profiles client
        JOIN profiles trainer ON client.trainer_id = trainer.id
        WHERE client.user_id::text = (storage.foldername(name))[1]
        AND trainer.user_id = auth.uid()
    )
);

-- Użytkownicy mogą uploadować do swojego folderu
CREATE POLICY "Użytkownicy uploadują zdjęcia postępu"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Użytkownicy mogą usuwać swoje zdjęcia
CREATE POLICY "Użytkownicy usuwają swoje zdjęcia postępu"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- 3. DIET-FILES - Polityki
-- ============================================
-- Bucket: diet-files (PRIVATE)
-- Trenerzy uploadują dla klientów, klienci pobierają swoje

-- Klienci widzą swoje pliki dietetyczne
CREATE POLICY "Klienci widzą swoje pliki dietetyczne"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'diet-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Trenerzy widzą pliki swoich klientów
CREATE POLICY "Trenerzy widzą pliki dietetyczne klientów"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'diet-files'
    AND EXISTS (
        SELECT 1 FROM profiles client
        JOIN profiles trainer ON client.trainer_id = trainer.id
        WHERE client.user_id::text = (storage.foldername(name))[1]
        AND trainer.user_id = auth.uid()
    )
);

-- Trenerzy mogą uploadować pliki dla klientów
CREATE POLICY "Trenerzy uploadują pliki dietetyczne"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'diet-files'
    AND (
        SELECT role FROM profiles 
        WHERE user_id = auth.uid()
    ) = 'trainer'
);

-- Trenerzy mogą usuwać pliki
CREATE POLICY "Trenerzy usuwają pliki dietetyczne"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'diet-files'
    AND (
        SELECT role FROM profiles 
        WHERE user_id = auth.uid()
    ) = 'trainer'
);

-- ============================================
-- STRUKTURA FOLDERÓW W BUCKETACH:
-- ============================================
--
-- exercise-videos/
--   {trainer_id}/
--     {exercise_id}/
--       video.mp4
--       thumbnail.jpg
--
-- progress-photos/
--   {user_id}/
--     {measurement_id}/
--       front.jpg
--       side.jpg
--       back.jpg
--
-- diet-files/
--   {client_user_id}/
--     {diet_plan_id}/
--       plan.pdf
--
-- ============================================

-- ============================================
-- KONIEC KONFIGURACJI STORAGE
-- ============================================
--
-- INSTRUKCJA TWORZENIA BUCKETÓW:
--
-- 1. Otwórz Supabase Dashboard → Storage
--
-- 2. Kliknij "New bucket" i utwórz:
--
--    a) exercise-videos
--       - Name: exercise-videos
--       - Public bucket: ✅ TAK (zaznacz)
--       - Allowed MIME types: video/mp4, video/quicktime, image/jpeg, image/png
--       - File size limit: 100MB
--
--    b) progress-photos
--       - Name: progress-photos
--       - Public bucket: ❌ NIE (odznacz)
--       - Allowed MIME types: image/jpeg, image/png, image/heic
--       - File size limit: 10MB
--
--    c) diet-files
--       - Name: diet-files
--       - Public bucket: ❌ NIE (odznacz)
--       - Allowed MIME types: application/pdf
--       - File size limit: 20MB
--
-- 3. Po utworzeniu bucketów uruchom ten SQL
--
-- 4. Sprawdź czy polityki się utworzyły:
--    Storage → [bucket] → Policies
--
-- ============================================

