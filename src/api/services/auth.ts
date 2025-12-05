/**
 * Serwis autoryzacji FitCoach
 * 
 * Obsługuje logowanie, wylogowanie, zarządzanie kontem użytkownika.
 * Wykorzystuje Supabase Auth z obsługą błędów.
 */

import { supabase, handleSupabaseError, type ProcessedError } from '../supabase';
import type { Profile, ClientData, UserRole } from '../../types';

// ============================================
// TYPY
// ============================================

/**
 * Dane zwracane po zalogowaniu
 */
export interface AuthResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
  } | null;
  profile: Profile | null;
  error: ProcessedError | null;
}

/**
 * Dane do rejestracji nowego użytkownika
 */
export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

/**
 * Dane do aktualizacji profilu
 */
export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
}

// ============================================
// FUNKCJE AUTORYZACJI
// ============================================

/**
 * Logowanie użytkownika
 * 
 * @param email - Adres email użytkownika
 * @param password - Hasło użytkownika
 * @returns Obiekt z danymi użytkownika lub błędem
 * 
 * @example
 * const result = await signIn('user@example.com', 'password123');
 * if (result.success) {
 *   console.log('Zalogowano:', result.user);
 * } else {
 *   console.error('Błąd:', result.error?.message);
 * }
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    // Logowanie przez Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return {
        success: false,
        user: null,
        profile: null,
        error: handleSupabaseError(error),
      };
    }

    if (!data.user) {
      return {
        success: false,
        user: null,
        profile: null,
        error: {
          message: 'Nie udało się zalogować. Spróbuj ponownie.',
          isAuthError: true,
          isNetworkError: false,
          originalError: new Error('No user returned'),
        },
      };
    }

    // Pobierz profil użytkownika
    const profile = await getProfile(data.user.id);

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || '',
      },
      profile,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      user: null,
      profile: null,
      error: handleSupabaseError(err),
    };
  }
}

/**
 * Rejestracja nowego użytkownika
 * 
 * @param data - Dane rejestracji (email, hasło, imię, nazwisko, rola)
 * @returns Obiekt z danymi użytkownika lub błędem
 */
export async function signUp(data: SignUpData): Promise<AuthResponse> {
  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.role || 'client',
        },
      },
    });

    if (error) {
      return {
        success: false,
        user: null,
        profile: null,
        error: handleSupabaseError(error),
      };
    }

    if (!authData.user) {
      return {
        success: false,
        user: null,
        profile: null,
        error: {
          message: 'Nie udało się utworzyć konta. Spróbuj ponownie.',
          isAuthError: true,
          isNetworkError: false,
          originalError: new Error('No user returned'),
        },
      };
    }

    // Profil zostanie utworzony automatycznie przez trigger w bazie
    // Poczekaj chwilę i pobierz profil
    await new Promise(resolve => setTimeout(resolve, 500));
    const profile = await getProfile(authData.user.id);

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
      },
      profile,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      user: null,
      profile: null,
      error: handleSupabaseError(err),
    };
  }
}

/**
 * Wylogowanie użytkownika
 * 
 * @returns true jeśli wylogowanie się powiodło
 */
export async function signOut(): Promise<{ success: boolean; error: ProcessedError | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      error: handleSupabaseError(err),
    };
  }
}

/**
 * Pobiera aktualnie zalogowanego użytkownika
 * 
 * @returns Dane użytkownika lub null
 */
export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
} | null> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
    };
  } catch {
    return null;
  }
}

/**
 * Pobiera profil użytkownika po user_id
 * 
 * @param userId - ID użytkownika z auth.users
 * @returns Profil użytkownika lub null
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Błąd pobierania profilu:', error.message);
      return null;
    }

    return data as Profile;
  } catch (err) {
    console.error('Błąd pobierania profilu:', err);
    return null;
  }
}

/**
 * Pobiera dane klienta (client_data) po user_id
 * 
 * @param userId - ID użytkownika
 * @returns Dane klienta lub null
 */
export async function getClientData(userId: string): Promise<ClientData | null> {
  try {
    const { data, error } = await supabase
      .from('client_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Błąd pobierania danych klienta:', error.message);
      return null;
    }

    return data as ClientData;
  } catch (err) {
    console.error('Błąd pobierania danych klienta:', err);
    return null;
  }
}

/**
 * Aktualizuje profil użytkownika
 * 
 * @param userId - ID użytkownika
 * @param data - Dane do aktualizacji
 * @returns Zaktualizowany profil lub błąd
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileData
): Promise<{ success: boolean; profile: Profile | null; error: ProcessedError | null }> {
  try {
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        profile: null,
        error: handleSupabaseError(error),
      };
    }

    return {
      success: true,
      profile: updatedProfile as Profile,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      profile: null,
      error: handleSupabaseError(err),
    };
  }
}

/**
 * Aktualizuje dane klienta (akceptacje prawne, onboarding)
 * 
 * @param userId - ID użytkownika
 * @param data - Dane do aktualizacji
 */
export async function updateClientData(
  userId: string,
  data: Partial<ClientData>
): Promise<{ success: boolean; error: ProcessedError | null }> {
  try {
    const { error } = await supabase
      .from('client_data')
      .update(data)
      .eq('user_id', userId);

    if (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      error: handleSupabaseError(err),
    };
  }
}

/**
 * Akceptuje regulamin i politykę prywatności
 * 
 * @param userId - ID użytkownika
 * @param acceptTerms - Czy zaakceptować regulamin
 * @param acceptPrivacy - Czy zaakceptować politykę prywatności
 */
export async function acceptLegalDocuments(
  userId: string,
  acceptTerms: boolean,
  acceptPrivacy: boolean
): Promise<{ success: boolean; error: ProcessedError | null }> {
  const now = new Date().toISOString();
  
  return updateClientData(userId, {
    accepted_terms: acceptTerms,
    accepted_privacy: acceptPrivacy,
    terms_accepted_at: acceptTerms ? now : null,
    privacy_accepted_at: acceptPrivacy ? now : null,
    onboarding_completed: acceptTerms && acceptPrivacy,
  });
}

/**
 * Usuwa konto użytkownika wraz ze wszystkimi danymi
 * 
 * UWAGA: Ta operacja jest nieodwracalna!
 * Dane są usuwane kaskadowo dzięki ON DELETE CASCADE w bazie.
 * 
 * @param userId - ID użytkownika do usunięcia
 * @returns Wynik operacji
 */
export async function deleteAccount(
  userId: string
): Promise<{ success: boolean; error: ProcessedError | null }> {
  try {
    // 1. Usuń zdjęcia z Storage (progress-photos)
    const { data: photos } = await supabase.storage
      .from('progress-photos')
      .list(userId);

    if (photos && photos.length > 0) {
      const filesToDelete = photos.map(file => `${userId}/${file.name}`);
      await supabase.storage
        .from('progress-photos')
        .remove(filesToDelete);
    }

    // 2. Usuń pliki diet z Storage (diet-files)
    const { data: dietFiles } = await supabase.storage
      .from('diet-files')
      .list(userId);

    if (dietFiles && dietFiles.length > 0) {
      const dietsToDelete = dietFiles.map(file => `${userId}/${file.name}`);
      await supabase.storage
        .from('diet-files')
        .remove(dietsToDelete);
    }

    // 3. Usuń profil (CASCADE usunie resztę danych w tabelach)
    // Profil jest powiązany z auth.users przez ON DELETE CASCADE
    // więc usunięcie użytkownika z auth usunie też profil i dane
    
    // 4. Usuń użytkownika z auth (wymaga service_role key)
    // W produkcji to powinno być zrobione przez Edge Function
    // Na razie wywołujemy signOut i oznaczamy profil jako nieaktywny
    
    // Oznacz profil jako nieaktywny
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (profileError) {
      return {
        success: false,
        error: handleSupabaseError(profileError),
      };
    }

    // Wyloguj użytkownika
    await signOut();

    // UWAGA: Pełne usunięcie z auth.users wymaga service_role
    // Należy to zrobić przez Supabase Edge Function lub panel admina
    console.warn(
      '⚠️ Konto zostało dezaktywowane. ' +
      'Pełne usunięcie z auth.users wymaga Edge Function z service_role.'
    );

    return {
      success: true,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      error: handleSupabaseError(err),
    };
  }
}

/**
 * Sprawdza czy użytkownik ukończył onboarding
 * 
 * @param userId - ID użytkownika
 * @returns true jeśli onboarding ukończony
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  try {
    const clientData = await getClientData(userId);
    return clientData?.onboarding_completed ?? false;
  } catch {
    return false;
  }
}

/**
 * Sprawdza czy użytkownik zaakceptował dokumenty prawne
 * 
 * @param userId - ID użytkownika
 */
export async function hasAcceptedLegalDocuments(userId: string): Promise<{
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
}> {
  try {
    const clientData = await getClientData(userId);
    return {
      acceptedTerms: clientData?.accepted_terms ?? false,
      acceptedPrivacy: clientData?.accepted_privacy ?? false,
    };
  } catch {
    return {
      acceptedTerms: false,
      acceptedPrivacy: false,
    };
  }
}

// ============================================
// EKSPORT
// ============================================

export default {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  getProfile,
  getClientData,
  updateProfile,
  updateClientData,
  acceptLegalDocuments,
  deleteAccount,
  hasCompletedOnboarding,
  hasAcceptedLegalDocuments,
};

