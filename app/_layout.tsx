/**
 * Root Layout - Główny layout aplikacji FitCoach
 *
 * Zawiera wszystkie providery i główną nawigację.
 * Expo Router dostarcza własny NavigationContainer,
 * więc używamy NavigationIndependentTree dla naszej nawigacji.
 */

import React, { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationIndependentTree } from '@react-navigation/native'
import { QueryClientProvider } from '@tanstack/react-query'
import 'react-native-reanimated'

import { queryClient } from '../src/api/queryClient'
import { AuthProvider } from '../src/context/AuthContext'
import RootNavigator from '../src/navigation'
import { OfflineBanner } from '../src/components/common/OfflineBanner'
import { initNetworkListener, registerOfflineHandlers, initializeStorage } from '../src/services/offline'

// ============================================
// INICJALIZACJA OFFLINE
// ============================================

let offlineInitialized = false

async function initOfflineServices() {
	if (offlineInitialized) return
	
	console.log('[App] Inicjalizacja serwisów offline...')
	
	try {
		// Załaduj dane z storage do pamięci
		await initializeStorage()
		
		// Zarejestruj handlery synchronizacji
		registerOfflineHandlers()
		
		// Nasłuchuj na zmiany sieci
		initNetworkListener()
		
		offlineInitialized = true
		console.log('[App] Serwisy offline zainicjalizowane ✅')
	} catch (error) {
		console.error('[App] Błąd inicjalizacji offline:', error)
	}
}

// ============================================
// ROOT LAYOUT
// ============================================

export default function RootLayout() {
	useEffect(() => {
		initOfflineServices()
	}, [])
	
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<SafeAreaProvider>
					<View style={styles.container}>
						<NavigationIndependentTree>
							<RootNavigator />
						</NavigationIndependentTree>
						<OfflineBanner />
					</View>
					<StatusBar style="light" />
				</SafeAreaProvider>
			</AuthProvider>
		</QueryClientProvider>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
})
