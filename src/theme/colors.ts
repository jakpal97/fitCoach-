/**
 * Paleta kolorów aplikacji FitCoach
 * 
 * Główna estetyka: ciemny, profesjonalny motyw z bordowymi akcentami
 * Inspiracja: premium fitness apps, dark mode interfaces
 */

export const colors = {
  // ============================================
  // KOLORY GŁÓWNE (Primary)
  // ============================================
  
  /**
   * Bordowa czerwień - główny kolor akcentowy
   * Użycie: przyciski, linki, ikony aktywne, focus states, FAB
   */
  primary: '#7A1022',
  
  /**
   * Jaśniejsza wersja primary - dla hover/pressed states
   */
  primaryLight: '#9A1A2E',
  
  /**
   * Ciemniejsza wersja primary - dla cieni, borders
   */
  primaryDark: '#5A0A18',

  // ============================================
  // KOLORY TŁA (Background)
  // ============================================
  
  /**
   * Ciemny granat - główne tło aplikacji
   * Użycie: tło ekranów, sekcji, modali
   */
  background: '#1A2332',
  
  /**
   * Czarny - powierzchnie kart, inputów
   * Użycie: karty, TextInputy, listy, bottom sheets
   */
  surface: '#000000',
  
  /**
   * Lekko jaśniejsze tło - dla zagnieżdżonych elementów
   */
  surfaceLight: '#0D0D0D',
  
  /**
   * Tło dla wybranych/aktywnych elementów
   */
  surfaceSelected: '#1A1A1A',

  // ============================================
  // KOLORY STATUSÓW (Semantic)
  // ============================================
  
  /**
   * Zielony sukces - ukończone treningi, checkmarki
   * Użycie: checkbox checked, toast success, completed status
   */
  success: '#10B981',
  
  /**
   * Jaśniejszy zielony - tło dla success states
   */
  successLight: '#D1FAE5',
  
  /**
   * Pomarańczowe ostrzeżenie - w trakcie, uwagi
   * Użycie: "w trakcie" status, ostrzeżenia niskiego priorytetu
   */
  warning: '#F59E0B',
  
  /**
   * Jaśniejszy pomarańczowy - tło dla warning states
   */
  warningLight: '#FEF3C7',
  
  /**
   * Czerwony błąd - błędy, usuwanie, pominięte treningi
   * Użycie: error messages, delete buttons, missed workouts
   */
  error: '#EF4444',
  
  /**
   * Jaśniejszy czerwony - tło dla error states
   */
  errorLight: '#FEE2E2',
  
  /**
   * Niebieski informacyjny - linki, informacje
   * Użycie: linki zewnętrzne, info toasts
   */
  info: '#3B82F6',
  
  /**
   * Jaśniejszy niebieski - tło dla info states
   */
  infoLight: '#DBEAFE',

  // ============================================
  // KOLORY TEKSTU (Text)
  // ============================================
  
  /**
   * Biały tekst - główny tekst na ciemnym tle
   * Użycie: nagłówki, główny content, etykiety
   */
  textPrimary: '#FFFFFF',
  
  /**
   * Szary tekst - drugorzędny tekst
   * Użycie: opisy, placeholdery, timestamps
   */
  textSecondary: '#9CA3AF',
  
  /**
   * Ciemniejszy szary - wyłączony/disabled tekst
   * Użycie: disabled buttons, nieaktywne elementy
   */
  textDisabled: '#6B7280',
  
  /**
   * Tekst na primary background
   * Użycie: tekst na bordowych przyciskach
   */
  textOnPrimary: '#FFFFFF',

  // ============================================
  // KOLORY OBRAMOWAŃ (Borders)
  // ============================================
  
  /**
   * Subtelne obramowanie - karty, inputy
   */
  border: '#374151',
  
  /**
   * Jaśniejsze obramowanie - dla lepszej widoczności
   */
  borderLight: '#4B5563',
  
  /**
   * Obramowanie focus - gdy element jest aktywny
   */
  borderFocus: '#7A1022',

  // ============================================
  // KOLORY OVERLAY (Przezroczyste)
  // ============================================
  
  /**
   * Ciemny overlay - dla modali, bottom sheets
   */
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  /**
   * Lekki overlay - dla delikatnych efektów
   */
  overlayLight: 'rgba(0, 0, 0, 0.5)',
  
  /**
   * Biały overlay - dla efektów na ciemnym tle
   */
  overlayWhite: 'rgba(255, 255, 255, 0.1)',

  // ============================================
  // KOLORY KATEGORII ĆWICZEŃ
  // ============================================
  
  /**
   * Badge dla ćwiczeń siłowych
   */
  categorySilowe: '#7A1022',
  
  /**
   * Badge dla ćwiczeń cardio
   */
  categoryCardio: '#F59E0B',
  
  /**
   * Badge dla stretchingu
   */
  categoryStretching: '#10B981',
  
  /**
   * Badge dla ćwiczeń core
   */
  categoryCore: '#8B5CF6',

  // ============================================
  // KOLORY POZIOMÓW TRUDNOŚCI
  // ============================================
  
  /**
   * Poziom łatwy
   */
  difficultyEasy: '#10B981',
  
  /**
   * Poziom średni
   */
  difficultyMedium: '#F59E0B',
  
  /**
   * Poziom trudny
   */
  difficultyHard: '#EF4444',

  // ============================================
  // GRADIENTY (jako stringi dla LinearGradient)
  // ============================================
  
  gradients: {
    /**
     * Gradient primary - dla nagłówków, hero sections
     */
    primary: ['#7A1022', '#5A0A18'],
    
    /**
     * Gradient tła - dla sekcji
     */
    background: ['#1A2332', '#0F1722'],
    
    /**
     * Gradient sukcesu - dla ukończonych elementów
     */
    success: ['#10B981', '#059669'],
  },
} as const;

// Typ dla kolorów - przydatny do TypeScript autocomplete
export type ColorName = keyof typeof colors;
export type Colors = typeof colors;

export default colors;

