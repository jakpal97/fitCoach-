/**
 * Konfiguracja klienta Supabase
 * 
 * Centralny punkt konfiguracji połączenia z Supabase.
 * Używa zmiennych środowiskowych z prefiksem EXPO_PUBLIC_.
 */

import { createClient, AuthError, PostgrestError } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// ZMIENNE ŚRODOWISKOWE
// ============================================

/**
 * URL projektu Supabase
 * Format: https://[PROJECT_ID].supabase.co
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

/**
 * Klucz anonimowy (publiczny) Supabase
 * Bezpieczny do użycia w aplikacji klienckiej
 */
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Walidacja zmiennych środowiskowych
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️ Brak zmiennych środowiskowych Supabase!\n' +
    'Upewnij się, że plik .env zawiera:\n' +
    '- EXPO_PUBLIC_SUPABASE_URL\n' +
    '- EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// ============================================
// KLIENT SUPABASE
// ============================================

/**
 * Główny klient Supabase
 * 
 * Używa AsyncStorage do przechowywania sesji użytkownika.
 * Auto-refresh tokenów jest włączony domyślnie.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Używamy AsyncStorage do przechowywania sesji na urządzeniu
    storage: AsyncStorage,
    // Automatyczne odświeżanie tokenów
    autoRefreshToken: true,
    // Trwała sesja między uruchomieniami aplikacji
    persistSession: true,
    // Wykrywanie zmiany sesji w innych kartach (web)
    detectSessionInUrl: false,
  },
});

// ============================================
// TYPY BŁĘDÓW
// ============================================

/**
 * Typ błędu Supabase (auth lub database)
 */
export type SupabaseError = AuthError | PostgrestError | Error;

/**
 * Struktura przetworzonego błędu
 */
export interface ProcessedError {
  message: string;
  code?: string;
  isAuthError: boolean;
  isNetworkError: boolean;
  originalError: SupabaseError;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sprawdza czy błąd jest błędem autoryzacji
 * 
 * @param error - Błąd do sprawdzenia
 * @returns true jeśli to błąd auth (np. wygasła sesja)
 */
export function isAuthError(error: unknown): error is AuthError {
  if (!error || typeof error !== 'object') return false;
  
  // AuthError z Supabase ma pole 'status' i '__isAuthError'
  const authError = error as AuthError;
  return (
    '__isAuthError' in authError ||
    (authError.name === 'AuthError') ||
    (authError.message?.toLowerCase().includes('jwt') ?? false) ||
    (authError.message?.toLowerCase().includes('token') ?? false) ||
    (authError.message?.toLowerCase().includes('session') ?? false)
  );
}

/**
 * Sprawdza czy błąd jest błędem bazy danych (PostgrestError)
 * 
 * @param error - Błąd do sprawdzenia
 * @returns true jeśli to błąd bazy danych
 */
export function isPostgrestError(error: unknown): error is PostgrestError {
  if (!error || typeof error !== 'object') return false;
  
  const pgError = error as PostgrestError;
  return 'code' in pgError && 'details' in pgError;
}

/**
 * Sprawdza czy błąd jest błędem sieci
 * 
 * @param error - Błąd do sprawdzenia
 * @returns true jeśli to błąd połączenia
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const err = error as Error;
  const message = err.message?.toLowerCase() || '';
  
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('offline')
  );
}

/**
 * Przetwarza błąd Supabase na przyjazny komunikat
 * 
 * @param error - Błąd z Supabase
 * @returns Przetworzony błąd z przyjaznym komunikatem
 */
export function handleSupabaseError(error: unknown): ProcessedError {
  // Domyślny błąd
  const defaultError: ProcessedError = {
    message: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
    isAuthError: false,
    isNetworkError: false,
    originalError: error as SupabaseError,
  };

  if (!error) return defaultError;

  // Błąd sieci
  if (isNetworkError(error)) {
    return {
      message: 'Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.',
      isAuthError: false,
      isNetworkError: true,
      originalError: error as SupabaseError,
    };
  }

  // Błąd autoryzacji
  if (isAuthError(error)) {
    const authError = error as AuthError;
    let message = 'Sesja wygasła. Zaloguj się ponownie.';

    // Mapowanie konkretnych błędów auth
    if (authError.message?.includes('Invalid login credentials')) {
      message = 'Nieprawidłowy email lub hasło.';
    } else if (authError.message?.includes('Email not confirmed')) {
      message = 'Email nie został potwierdzony. Sprawdź skrzynkę pocztową.';
    } else if (authError.message?.includes('User already registered')) {
      message = 'Użytkownik z tym adresem email już istnieje.';
    } else if (authError.message?.includes('Password')) {
      message = 'Hasło musi mieć co najmniej 6 znaków.';
    }

    return {
      message,
      code: authError.status?.toString(),
      isAuthError: true,
      isNetworkError: false,
      originalError: authError,
    };
  }

  // Błąd bazy danych (PostgrestError)
  if (isPostgrestError(error)) {
    const pgError = error as PostgrestError;
    let message = 'Błąd bazy danych. Spróbuj ponownie.';

    // Mapowanie kodów błędów PostgreSQL
    switch (pgError.code) {
      case '23505': // unique_violation
        message = 'Ten rekord już istnieje.';
        break;
      case '23503': // foreign_key_violation
        message = 'Nie można usunąć - rekord jest używany przez inne dane.';
        break;
      case '42501': // insufficient_privilege
        message = 'Brak uprawnień do wykonania tej operacji.';
        break;
      case 'PGRST116': // no rows returned
        message = 'Nie znaleziono danych.';
        break;
      default:
        message = pgError.message || message;
    }

    return {
      message,
      code: pgError.code,
      isAuthError: false,
      isNetworkError: false,
      originalError: pgError,
    };
  }

  // Ogólny błąd Error
  if (error instanceof Error) {
    return {
      message: error.message || defaultError.message,
      isAuthError: false,
      isNetworkError: false,
      originalError: error,
    };
  }

  return defaultError;
}

/**
 * Pobiera aktualną sesję użytkownika
 * 
 * @returns Sesja lub null jeśli niezalogowany
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Błąd pobierania sesji:', error.message);
    return null;
  }
  
  return data.session;
}

/**
 * Pobiera aktualnego użytkownika
 * 
 * @returns Użytkownik lub null jeśli niezalogowany
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Błąd pobierania użytkownika:', error.message);
    return null;
  }
  
  return data.user;
}

// Export domyślny
export default supabase;

