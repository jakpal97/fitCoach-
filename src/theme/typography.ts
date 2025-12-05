/**
 * Typografia aplikacji FitCoach
 * 
 * System typografii zapewniający spójność tekstów w całej aplikacji.
 * Bazuje na systemowych czcionkach dla optymalnej wydajności.
 */

// ============================================
// ROZMIARY CZCIONEK (Font Sizes)
// ============================================

export const fontSizes = {
  /**
   * Nagłówek 1 - główne tytuły ekranów
   * Użycie: "DZISIEJSZY TRENING", nazwy głównych sekcji
   */
  h1: 32,
  
  /**
   * Nagłówek 2 - tytuły sekcji
   * Użycie: "Twoi klienci", nazwy kart
   */
  h2: 28,
  
  /**
   * Nagłówek 3 - podtytuły
   * Użycie: nazwy dni tygodnia, nagłówki modali
   */
  h3: 24,
  
  /**
   * Nagłówek 4 - małe nagłówki
   * Użycie: nazwy ćwiczeń w kartach
   */
  h4: 20,
  
  /**
   * Nagłówek 5 - etykiety sekcji
   * Użycie: "Serie", "Powtórzenia", etykiety form
   */
  h5: 18,
  
  /**
   * Nagłówek 6 - najmniejsze nagłówki
   * Użycie: badge labels, category names
   */
  h6: 16,
  
  /**
   * Tekst główny - standardowy tekst
   * Użycie: opisy, instrukcje, content
   */
  body: 16,
  
  /**
   * Tekst mniejszy - dla gęstszych sekcji
   * Użycie: listy, szczegóły ćwiczeń
   */
  bodySmall: 14,
  
  /**
   * Podpisy - meta informacje
   * Użycie: daty, timestamps, autor wiadomości
   */
  caption: 12,
  
  /**
   * Najmniejszy tekst
   * Użycie: footnotes, legal text, badges
   */
  small: 10,
  
  /**
   * Duży tekst dla wyróżnienia
   * Użycie: liczby w statystykach, czas odpoczynku
   */
  large: 36,
  
  /**
   * Ekstra duży - hero numbers
   * Użycie: główne statystyki, progress percentage
   */
  xlarge: 48,
} as const;

// ============================================
// GRUBOŚCI CZCIONEK (Font Weights)
// ============================================

export const fontWeights = {
  /**
   * Lekka - rzadko używana, dla subtelnych tekstów
   */
  light: '300' as const,
  
  /**
   * Normalna - główny tekst, opisy
   * Użycie: body text, descriptions
   */
  regular: '400' as const,
  
  /**
   * Średnia - lekkie wyróżnienie
   * Użycie: labels, secondary headings
   */
  medium: '500' as const,
  
  /**
   * Półgruba - nagłówki, ważne elementy
   * Użycie: card titles, section headers
   */
  semibold: '600' as const,
  
  /**
   * Gruba - główne nagłówki, CTA
   * Użycie: h1, h2, button text, important labels
   */
  bold: '700' as const,
  
  /**
   * Ekstra gruba - hero text
   * Użycie: duże liczby, main stats
   */
  extrabold: '800' as const,
} as const;

// ============================================
// WYSOKOŚCI LINII (Line Heights)
// ============================================

export const lineHeights = {
  /**
   * Ciasna - dla nagłówków
   * Mnożnik: 1.2
   */
  tight: 1.2,
  
  /**
   * Normalna - dla body text
   * Mnożnik: 1.5
   */
  normal: 1.5,
  
  /**
   * Luźna - dla lepszej czytelności długich tekstów
   * Mnożnik: 1.75
   */
  relaxed: 1.75,
  
  /**
   * Luźna - dla bardzo długich bloków tekstu
   * Mnożnik: 2
   */
  loose: 2,
} as const;

// ============================================
// ODSTĘPY MIĘDZY LITERAMI (Letter Spacing)
// ============================================

export const letterSpacing = {
  /**
   * Ciasny - dla dużych nagłówków
   */
  tight: -0.5,
  
  /**
   * Normalny - standardowy tekst
   */
  normal: 0,
  
  /**
   * Szeroki - dla uppercase labels
   */
  wide: 0.5,
  
  /**
   * Bardzo szeroki - dla małego uppercase tekstu
   */
  wider: 1,
} as const;

// ============================================
// PREDEFINIOWANE STYLE TEKSTÓW
// ============================================

/**
 * Gotowe style do użycia w komponentach
 * Kombinacja size, weight, lineHeight
 */
export const textStyles = {
  // Nagłówki
  h1: {
    fontSize: fontSizes.h1,
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes.h1 * lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontSize: fontSizes.h2,
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes.h2 * lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontSize: fontSizes.h3,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.h3 * lineHeights.tight,
  },
  h4: {
    fontSize: fontSizes.h4,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.h4 * lineHeights.tight,
  },
  h5: {
    fontSize: fontSizes.h5,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.h5 * lineHeights.normal,
  },
  h6: {
    fontSize: fontSizes.h6,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.h6 * lineHeights.normal,
  },
  
  // Body text
  body: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.body * lineHeights.normal,
  },
  bodySmall: {
    fontSize: fontSizes.bodySmall,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.bodySmall * lineHeights.normal,
  },
  bodyBold: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.body * lineHeights.normal,
  },
  
  // Pomocnicze
  caption: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.caption * lineHeights.normal,
  },
  captionBold: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.caption * lineHeights.normal,
  },
  small: {
    fontSize: fontSizes.small,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.small * lineHeights.normal,
  },
  
  // Specjalne
  label: {
    fontSize: fontSizes.bodySmall,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.bodySmall * lineHeights.tight,
    letterSpacing: letterSpacing.wide,
  },
  button: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.body * lineHeights.tight,
    letterSpacing: letterSpacing.wide,
  },
  buttonSmall: {
    fontSize: fontSizes.bodySmall,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.bodySmall * lineHeights.tight,
  },
  
  // Duże liczby/statystyki
  statLarge: {
    fontSize: fontSizes.xlarge,
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes.xlarge * lineHeights.tight,
  },
  statMedium: {
    fontSize: fontSizes.large,
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes.large * lineHeights.tight,
  },
} as const;

// Typy dla TypeScript
export type FontSize = keyof typeof fontSizes;
export type FontWeight = keyof typeof fontWeights;
export type LineHeight = keyof typeof lineHeights;
export type TextStyle = keyof typeof textStyles;

export default {
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  textStyles,
};

