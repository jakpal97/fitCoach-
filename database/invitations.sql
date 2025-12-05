-- ============================================
-- TABELA ZAPROSZEŃ KLIENTÓW
-- ============================================
-- Trener wysyła zaproszenie, klient rejestruje się z kodem

CREATE TABLE IF NOT EXISTS client_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Trener który wysłał zaproszenie
    trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Email klienta
    client_email TEXT NOT NULL,
    -- Unikalny kod zaproszenia (6 znaków)
    invitation_code TEXT NOT NULL UNIQUE,
    -- Status: pending, accepted, expired
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
    -- Data wygaśnięcia (7 dni)
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    -- ID klienta po akceptacji
    client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    -- Jeden pending invite per email per trainer
    UNIQUE (trainer_id, client_email, status)
);

COMMENT ON TABLE client_invitations IS 'Zaproszenia klientów od trenerów';
COMMENT ON COLUMN client_invitations.invitation_code IS 'Unikalny 6-znakowy kod do rejestracji';

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_invitations_trainer ON client_invitations(trainer_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON client_invitations(client_email);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON client_invitations(invitation_code);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

-- Trener widzi swoje zaproszenia
CREATE POLICY "Trainer can view own invitations"
ON client_invitations FOR SELECT
TO authenticated
USING (trainer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Trener może tworzyć zaproszenia
CREATE POLICY "Trainer can create invitations"
ON client_invitations FOR INSERT
TO authenticated
WITH CHECK (
    trainer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid() AND role IN ('trainer', 'admin'))
);

-- Trener może aktualizować swoje zaproszenia
CREATE POLICY "Trainer can update own invitations"
ON client_invitations FOR UPDATE
TO authenticated
USING (trainer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Publiczny dostęp do weryfikacji kodu (bez auth)
CREATE POLICY "Anyone can verify invitation code"
ON client_invitations FOR SELECT
TO anon
USING (status = 'pending' AND expires_at > NOW());

-- ============================================
-- FUNKCJA: Generuj kod zaproszenia
-- ============================================

CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNKCJA: Akceptuj zaproszenie przy rejestracji
-- ============================================
-- Wywoływana po rejestracji klienta

CREATE OR REPLACE FUNCTION accept_invitation(p_invitation_code TEXT, p_client_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_invitation client_invitations%ROWTYPE;
    v_trainer_id UUID;
BEGIN
    -- Znajdź zaproszenie
    SELECT * INTO v_invitation
    FROM client_invitations
    WHERE invitation_code = p_invitation_code
      AND status = 'pending'
      AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Zaktualizuj zaproszenie
    UPDATE client_invitations
    SET status = 'accepted',
        client_id = p_client_id,
        accepted_at = NOW()
    WHERE id = v_invitation.id;
    
    -- Przypisz klienta do trenera
    UPDATE profiles
    SET trainer_id = v_invitation.trainer_id
    WHERE id = p_client_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Auto-generuj kod przy insercie
-- ============================================

CREATE OR REPLACE FUNCTION set_invitation_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invitation_code IS NULL THEN
        NEW.invitation_code := generate_invitation_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invitation_code
BEFORE INSERT ON client_invitations
FOR EACH ROW
EXECUTE FUNCTION set_invitation_code();

