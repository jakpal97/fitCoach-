/**
 * Konfiguracja React Query dla FitCoach
 *
 * QueryClient z optymalnymi ustawieniami dla aplikacji mobilnej.
 */

import { QueryClient } from '@tanstack/react-query'

/**
 * Główny QueryClient dla aplikacji
 *
 * Ustawienia:
 * - staleTime: 5 minut - dane są "świeże" przez 5 minut
 * - gcTime: 10 minut - dane w cache przez 10 minut
 * - retry: 2 - próbuj 2 razy przy błędzie
 */
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Dane są "świeże" przez 5 minut
			staleTime: 5 * 60 * 1000,
			// Garbage collection po 10 minutach
			gcTime: 10 * 60 * 1000,
			// Retry 2 razy przy błędzie
			retry: 2,
			// Nie refetchuj przy focus window (oszczędność baterii)
			refetchOnWindowFocus: false,
			// Refetchuj przy reconnect
			refetchOnReconnect: true,
		},
		mutations: {
			// Retry 1 raz przy mutacjach
			retry: 1,
		},
	},
})

export default queryClient

