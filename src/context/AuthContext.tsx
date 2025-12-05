/**
 * AuthContext - Kontekst autoryzacji FitCoach
 * 
 * Zarządza stanem zalogowanego użytkownika w całej aplikacji.
 * Udostępnia funkcje logowania, wylogowania i usuwania konta.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { supabase } from '../api/supabase';
import {
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
  getProfile,
  getClientData,
  deleteAccount as authDeleteAccount,
  acceptLegalDocuments,
  type SignUpData,
  type AuthResponse,
} from '../api/services/auth';
import type { Profile, ClientData } from '../types';

// ============================================
// TYPY
// ============================================

/**
 * Stan kontekstu autoryzacji
 */
interface AuthState {
  /** Czy trwa ładowanie stanu autoryzacji */
  isLoading: boolean;
  /** Czy użytkownik jest zalogowany */
  isAuthenticated: boolean;
  /** Aktualny użytkownik (z auth) */
  currentUser: {
    id: string;
    email: string;
  } | null;
  /** Profil użytkownika (z tabeli profiles) */
  profile: Profile | null;
  /** Dane klienta (z tabeli client_data) */
  clientData: ClientData | null;
}

/**
 * Akcje dostępne w kontekście
 */
interface AuthActions {
  /** Logowanie */
  login: (email: string, password: string) => Promise<AuthResponse>;
  /** Rejestracja */
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    invitationCode?: string
  ) => Promise<AuthResponse>;
  /** Wylogowanie */
  logout: () => Promise<void>;
  /** Usunięcie konta */
  deleteAccount: () => Promise<{ success: boolean; error: string | null }>;
  /** Akceptacja dokumentów prawnych */
  acceptLegal: (terms: boolean, privacy: boolean) => Promise<boolean>;
  /** Odświeżenie profilu */
  refreshProfile: () => Promise<void>;
  /** Odświeżenie danych klienta */
  refreshClientData: () => Promise<void>;
}

/**
 * Pełny typ kontekstu
 */
type AuthContextType = AuthState & AuthActions;

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider kontekstu autoryzacji
 * 
 * Opakowuje aplikację i udostępnia stan autoryzacji wszystkim komponentom.
 * 
 * @example
 * ```tsx
 * // W App.tsx
 * <AuthProvider>
 *   <NavigationContainer>
 *     <RootNavigator />
 *   </NavigationContainer>
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Stan
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthState['currentUser']>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);

  // Computed
  const isAuthenticated = currentUser !== null;

  // ============================================
  // EFEKTY
  // ============================================

  /**
   * Sprawdź sesję przy starcie aplikacji
   */
  useEffect(() => {
    checkSession();

    // Nasłuchuj na zmiany sesji (logowanie/wylogowanie)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email || '',
          });
          // Pobierz profil i dane klienta
          await loadUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setProfile(null);
          setClientData(null);
        }

        setIsLoading(false);
      }
    );

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ============================================
  // FUNKCJE POMOCNICZE
  // ============================================

  /**
   * Sprawdź istniejącą sesję
   */
  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
        });
        await loadUserData(session.user.id);
      }
    } catch (error) {
      console.error('Błąd sprawdzania sesji:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Załaduj dane użytkownika (profil + client_data)
   */
  const loadUserData = async (userId: string) => {
    try {
      const [userProfile, userClientData] = await Promise.all([
        getProfile(userId),
        getClientData(userId),
      ]);

      setProfile(userProfile);
      setClientData(userClientData);
    } catch (error) {
      console.error('Błąd ładowania danych użytkownika:', error);
    }
  };

  // ============================================
  // AKCJE
  // ============================================

  /**
   * Logowanie
   */
  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    
    try {
      const result = await authSignIn(email, password);

      if (result.success && result.user) {
        setCurrentUser(result.user);
        setProfile(result.profile);
        
        // Pobierz też client_data
        if (result.user.id) {
          const clientDataResult = await getClientData(result.user.id);
          setClientData(clientDataResult);
        }
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Rejestracja
   */
  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    invitationCode?: string
  ): Promise<AuthResponse> => {
    setIsLoading(true);
    
    try {
      const result = await authSignUp({
        email,
        password,
        firstName,
        lastName,
        role: 'client',
        invitationCode,
      });

      if (result.success && result.user) {
        setCurrentUser(result.user);
        setProfile(result.profile);
        
        // Pobierz client_data
        if (result.user.id) {
          const clientDataResult = await getClientData(result.user.id);
          setClientData(clientDataResult);
        }
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Wylogowanie
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    
    try {
      await authSignOut();
      setCurrentUser(null);
      setProfile(null);
      setClientData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Usunięcie konta
   */
  const deleteAccount = useCallback(async (): Promise<{ success: boolean; error: string | null }> => {
    if (!currentUser) {
      return { success: false, error: 'Nie jesteś zalogowany' };
    }

    setIsLoading(true);
    
    try {
      const result = await authDeleteAccount(currentUser.id);

      if (result.success) {
        setCurrentUser(null);
        setProfile(null);
        setClientData(null);
      }

      return {
        success: result.success,
        error: result.error?.message || null,
      };
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  /**
   * Akceptacja dokumentów prawnych
   */
  const acceptLegal = useCallback(async (terms: boolean, privacy: boolean): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const result = await acceptLegalDocuments(currentUser.id, terms, privacy);

      if (result.success) {
        // Odśwież dane klienta
        const updatedClientData = await getClientData(currentUser.id);
        setClientData(updatedClientData);
      }

      return result.success;
    } catch {
      return false;
    }
  }, [currentUser]);

  /**
   * Odśwież profil
   */
  const refreshProfile = useCallback(async () => {
    if (!currentUser) return;

    const updatedProfile = await getProfile(currentUser.id);
    setProfile(updatedProfile);
  }, [currentUser]);

  /**
   * Odśwież dane klienta
   */
  const refreshClientData = useCallback(async () => {
    if (!currentUser) return;

    const updatedClientData = await getClientData(currentUser.id);
    setClientData(updatedClientData);
  }, [currentUser]);

  // ============================================
  // WARTOŚĆ KONTEKSTU
  // ============================================

  const contextValue = useMemo<AuthContextType>(() => ({
    // Stan
    isLoading,
    isAuthenticated,
    currentUser,
    profile,
    clientData,
    // Akcje
    login,
    register,
    logout,
    deleteAccount,
    acceptLegal,
    refreshProfile,
    refreshClientData,
  }), [
    isLoading,
    isAuthenticated,
    currentUser,
    profile,
    clientData,
    login,
    register,
    logout,
    deleteAccount,
    acceptLegal,
    refreshProfile,
    refreshClientData,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

/**
 * Hook do użycia kontekstu autoryzacji
 * 
 * @returns Obiekt z stanem i akcjami autoryzacji
 * @throws Error jeśli użyty poza AuthProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, profile, login, logout } = useAuth();
 *   
 *   if (!isAuthenticated) {
 *     return <LoginScreen onLogin={login} />;
 *   }
 *   
 *   return (
 *     <View>
 *       <Text>Witaj, {profile?.first_name}!</Text>
 *       <Button onPress={logout} title="Wyloguj" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth musi być użyty wewnątrz AuthProvider');
  }

  return context;
}

// ============================================
// EKSPORT
// ============================================

export default AuthProvider;

