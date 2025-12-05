/**
 * Root Layout - Główny layout aplikacji FitCoach
 *
 * Zawiera wszystkie providery i główną nawigację.
 * Expo Router dostarcza własny NavigationContainer,
 * więc używamy NavigationIndependentTree dla naszej nawigacji.
 */

import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationIndependentTree } from '@react-navigation/native'
import { QueryClientProvider } from '@tanstack/react-query'
import 'react-native-reanimated'

import { queryClient } from '../src/api/queryClient'
import { AuthProvider } from '../src/context/AuthContext'
import RootNavigator from '../src/navigation'

// ============================================
// ROOT LAYOUT
// ============================================

export default function RootLayout() {
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<SafeAreaProvider>
					<NavigationIndependentTree>
						<RootNavigator />
					</NavigationIndependentTree>
					<StatusBar style="light" />
				</SafeAreaProvider>
			</AuthProvider>
		</QueryClientProvider>
	)
}
