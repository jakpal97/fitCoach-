/**
 * AuthNavigator - Nawigacja dla niezalogowanych użytkowników
 *
 * Stack zawierający ekrany logowania i onboardingu.
 */

import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import LoginScreen from '../screens/auth/LoginScreen'
import RegisterScreen from '../screens/auth/RegisterScreen'
import OnboardingScreen from '../screens/auth/OnboardingScreen'
import { colors } from '../theme/colors'

// ============================================
// TYPY NAWIGACJI
// ============================================

export type AuthStackParamList = {
	Login: undefined
	Register: undefined
	Onboarding: undefined
}

// ============================================
// STACK NAVIGATOR
// ============================================

const Stack = createNativeStackNavigator<AuthStackParamList>()

export default function AuthNavigator() {
	return (
		<Stack.Navigator
			initialRouteName="Login"
			screenOptions={{
				headerShown: false,
				contentStyle: { backgroundColor: colors.background },
				animation: 'slide_from_right',
			}}>
			<Stack.Screen name="Login" component={LoginScreen} />
			<Stack.Screen name="Register" component={RegisterScreen} />
			<Stack.Screen name="Onboarding" component={OnboardingScreen} />
		</Stack.Navigator>
	)
}

