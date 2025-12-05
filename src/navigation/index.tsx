/**
 * RootNavigator - Główna nawigacja aplikacji FitCoach
 *
 * Sprawdza stan autoryzacji i wyświetla:
 * - AuthNavigator (Login, Onboarding) gdy niezalogowany
 * - AppNavigator (Client/Trainer tabs) gdy zalogowany
 */

import React from 'react'
import { View, ActivityIndicator, Text } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import AuthNavigator from './AuthNavigator'
import AppNavigator from './AppNavigator'
import OnboardingScreen from '../screens/auth/OnboardingScreen'
import { colors } from '../theme/colors'

// ============================================
// NAVIGATION THEME (dark mode)
// ============================================

const navigationTheme = {
	dark: true,
	colors: {
		primary: colors.primary,
		background: colors.background,
		card: colors.surface,
		text: colors.textPrimary,
		border: colors.border,
		notification: colors.primary,
	},
	fonts: {
		regular: {
			fontFamily: 'System',
			fontWeight: '400' as const,
		},
		medium: {
			fontFamily: 'System',
			fontWeight: '500' as const,
		},
		bold: {
			fontFamily: 'System',
			fontWeight: '700' as const,
		},
		heavy: {
			fontFamily: 'System',
			fontWeight: '800' as const,
		},
	},
}

// ============================================
// LOADING SCREEN
// ============================================

function LoadingScreen() {
	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors.background,
				justifyContent: 'center',
				alignItems: 'center',
			}}>
			<ActivityIndicator size="large" color={colors.primary} />
			<Text
				style={{
					color: colors.textSecondary,
					marginTop: 16,
					fontSize: 16,
				}}>
				Ładowanie...
			</Text>
		</View>
	)
}

// ============================================
// ROOT NAVIGATOR
// ============================================

export default function RootNavigator() {
	const { isLoading, isAuthenticated, profile, clientData } = useAuth()

	// Pokaż loading podczas sprawdzania sesji
	if (isLoading) {
		return <LoadingScreen />
	}

	// Sprawdź czy klient potrzebuje onboardingu
	const needsOnboarding =
		isAuthenticated &&
		profile?.role === 'client' &&
		(!clientData || !clientData.accepted_terms || !clientData.accepted_privacy || !clientData.onboarding_completed)

	return (
		<NavigationContainer theme={navigationTheme}>
			{!isAuthenticated ? (
				// Niezalogowany → pokaż AuthNavigator
				<AuthNavigator />
			) : needsOnboarding ? (
				// Zalogowany klient ale nie ukończył onboardingu
				<OnboardingWrapper />
			) : (
				// Zalogowany i onboarding ukończony → pokaż AppNavigator
				<AppNavigator />
			)}
		</NavigationContainer>
	)
}

// Wrapper dla OnboardingScreen żeby działał w kontekście nawigacji
function OnboardingWrapper() {
	return (
		<View style={{ flex: 1 }}>
			<OnboardingScreen />
		</View>
	)
}

// ============================================
// EKSPORTY TYPÓW
// ============================================

export type { AuthStackParamList } from './AuthNavigator'
export type { ClientTabParamList, TrainerTabParamList, AppStackParamList } from './AppNavigator'
