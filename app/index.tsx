/**
 * Index - Punkt wejścia Expo Router
 *
 * Ten plik jest wymagany przez expo-router, ale nawigacja
 * jest obsługiwana przez RootNavigator w _layout.tsx
 */

import { Redirect } from 'expo-router'

export default function Index() {
	// Przekierowanie nie jest potrzebne, bo _layout.tsx
	// renderuje RootNavigator który obsługuje całą nawigację
	return null
}

