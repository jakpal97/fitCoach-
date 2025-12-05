/**
 * AppNavigator - Nawigacja dla zalogowanych użytkowników
 *
 * Zawiera Bottom Tabs dla klienta i Stack dla trenera.
 */

import React from 'react'
import { View, Text } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'
import ExerciseLibraryScreen from '../screens/trainer/ExerciseLibraryScreen'
import AddExerciseScreen from '../screens/trainer/AddExerciseScreen'
import ExerciseDetailScreen from '../screens/trainer/ExerciseDetailScreen'
import EditExerciseScreen from '../screens/trainer/EditExerciseScreen'
import TrainerDashboardScreen from '../screens/trainer/TrainerDashboardScreen'
import ClientsListScreen from '../screens/trainer/ClientsListScreen'
import ClientDetailScreen from '../screens/trainer/ClientDetailScreen'
import AddClientScreen from '../screens/trainer/AddClientScreen'
import CreatePlanScreen from '../screens/trainer/CreatePlanScreen'
import PlanDetailScreen from '../screens/trainer/PlanDetailScreen'
import ChatScreen from '../screens/shared/ChatScreen'

// ============================================
// PLACEHOLDER SCREENS (do zastąpienia później)
// ============================================

// Client Screens
function ClientHomeScreen() {
	return (
		<View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
			<Text style={{ color: colors.textPrimary, fontSize: 24 }}>🏋️ Dzisiejszy Trening</Text>
			<Text style={{ color: colors.textSecondary, marginTop: 8 }}>Ekran w budowie...</Text>
		</View>
	)
}

function ClientProgressScreen() {
	return (
		<View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
			<Text style={{ color: colors.textPrimary, fontSize: 24 }}>📊 Postępy</Text>
			<Text style={{ color: colors.textSecondary, marginTop: 8 }}>Ekran w budowie...</Text>
		</View>
	)
}

function ClientSettingsScreen() {
	const { logout, profile } = useAuth()
	
	return (
		<View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
			<Text style={{ color: colors.textPrimary, fontSize: 24 }}>⚙️ Ustawienia</Text>
			<Text style={{ color: colors.textSecondary, marginTop: 8, marginBottom: 24 }}>
				Zalogowany jako: {profile?.first_name} {profile?.last_name}
			</Text>
			<Text 
				style={{ color: colors.primary, fontSize: 16 }}
				onPress={logout}
			>
				Wyloguj się
			</Text>
		</View>
	)
}

// TrainerDashboardScreen - zaimportowany z ../screens/trainer/TrainerDashboardScreen
// TrainerExerciseLibraryScreen - zaimportowany z ../screens/trainer/ExerciseLibraryScreen

// TrainerClientsScreen - zaimportowany z ../screens/trainer/ClientsListScreen

function TrainerSettingsScreen() {
	const { logout, profile } = useAuth()
	
	return (
		<View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
			<Text style={{ color: colors.textPrimary, fontSize: 24 }}>⚙️ Ustawienia</Text>
			<Text style={{ color: colors.textSecondary, marginTop: 8, marginBottom: 24 }}>
				Trener: {profile?.first_name} {profile?.last_name}
			</Text>
			<Text 
				style={{ color: colors.primary, fontSize: 16 }}
				onPress={logout}
			>
				Wyloguj się
			</Text>
		</View>
	)
}

// ============================================
// TYPY NAWIGACJI
// ============================================

// Client Tab Navigator
export type ClientTabParamList = {
	Home: undefined
	Progress: undefined
	Settings: undefined
}

// Trainer Tab Navigator
export type TrainerTabParamList = {
	Dashboard: undefined
	ExerciseLibrary: undefined
	Clients: undefined
	Settings: undefined
}

// Main App Stack (dla modali i nested screens)
export type AppStackParamList = {
	ClientTabs: undefined
	TrainerTabs: undefined
	// Dodatkowe ekrany (modals, details)
	AddExercise: undefined
	EditExercise: { exerciseId: string }
	ExerciseDetail: { exerciseId: string }
	AddClient: undefined
	ClientDetail: { clientId: string }
	CreatePlan: { clientId: string }
	PlanDetail: { planId: string }
	Chat: { recipientId: string }
}

// ============================================
// CLIENT TAB NAVIGATOR
// ============================================

const ClientTab = createBottomTabNavigator<ClientTabParamList>()

function ClientTabNavigator() {
	return (
		<ClientTab.Navigator
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: colors.surface,
					borderTopColor: colors.border,
					borderTopWidth: 1,
					height: 60,
					paddingBottom: 8,
					paddingTop: 8,
				},
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.textSecondary,
				tabBarLabelStyle: {
					fontSize: 12,
					fontWeight: '500',
				},
			}}>
			<ClientTab.Screen
				name="Home"
				component={ClientHomeScreen}
				options={{
					tabBarLabel: 'Trening',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="fitness" size={size} color={color} />
					),
				}}
			/>
			<ClientTab.Screen
				name="Progress"
				component={ClientProgressScreen}
				options={{
					tabBarLabel: 'Postępy',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="stats-chart" size={size} color={color} />
					),
				}}
			/>
			<ClientTab.Screen
				name="Settings"
				component={ClientSettingsScreen}
				options={{
					tabBarLabel: 'Ustawienia',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="settings" size={size} color={color} />
					),
				}}
			/>
		</ClientTab.Navigator>
	)
}

// ============================================
// TRAINER TAB NAVIGATOR
// ============================================

const TrainerTab = createBottomTabNavigator<TrainerTabParamList>()

function TrainerTabNavigator() {
	return (
		<TrainerTab.Navigator
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: colors.surface,
					borderTopColor: colors.border,
					borderTopWidth: 1,
					height: 60,
					paddingBottom: 8,
					paddingTop: 8,
				},
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.textSecondary,
				tabBarLabelStyle: {
					fontSize: 12,
					fontWeight: '500',
				},
			}}>
			<TrainerTab.Screen
				name="Dashboard"
				component={TrainerDashboardScreen}
				options={{
					tabBarLabel: 'Dashboard',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="home" size={size} color={color} />
					),
				}}
			/>
			<TrainerTab.Screen
				name="ExerciseLibrary"
				component={ExerciseLibraryScreen}
				options={{
					tabBarLabel: 'Ćwiczenia',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="barbell" size={size} color={color} />
					),
				}}
			/>
			<TrainerTab.Screen
				name="Clients"
				component={ClientsListScreen}
				options={{
					tabBarLabel: 'Klienci',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="people" size={size} color={color} />
					),
				}}
			/>
			<TrainerTab.Screen
				name="Settings"
				component={TrainerSettingsScreen}
				options={{
					tabBarLabel: 'Ustawienia',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="settings" size={size} color={color} />
					),
				}}
			/>
		</TrainerTab.Navigator>
	)
}

// ============================================
// MAIN APP NAVIGATOR
// ============================================

const AppStack = createNativeStackNavigator<AppStackParamList>()

export default function AppNavigator() {
	const { profile } = useAuth()
	const isTrainer = profile?.role === 'trainer' || profile?.role === 'admin'

	return (
		<AppStack.Navigator
			screenOptions={{
				headerShown: false,
				contentStyle: { backgroundColor: colors.background },
			}}>
			{isTrainer ? (
				<AppStack.Screen name="TrainerTabs" component={TrainerTabNavigator} />
			) : (
				<AppStack.Screen name="ClientTabs" component={ClientTabNavigator} />
			)}
			{/* Dodatkowe ekrany */}
			<AppStack.Screen 
				name="AddExercise" 
				component={AddExerciseScreen}
				options={{
					presentation: 'modal',
					animation: 'slide_from_bottom',
				}}
			/>
			<AppStack.Screen 
				name="ExerciseDetail" 
				component={ExerciseDetailScreen}
				options={{
					animation: 'slide_from_right',
				}}
			/>
			<AppStack.Screen 
				name="EditExercise" 
				component={EditExerciseScreen}
				options={{
					presentation: 'modal',
					animation: 'slide_from_bottom',
				}}
			/>
			<AppStack.Screen 
				name="ClientDetail" 
				component={ClientDetailScreen}
				options={{
					animation: 'slide_from_right',
				}}
			/>
			<AppStack.Screen 
				name="AddClient" 
				component={AddClientScreen}
				options={{
					presentation: 'modal',
					animation: 'slide_from_bottom',
				}}
			/>
			<AppStack.Screen 
				name="CreatePlan" 
				component={CreatePlanScreen}
				options={{
					presentation: 'modal',
					animation: 'slide_from_bottom',
				}}
			/>
			<AppStack.Screen 
				name="PlanDetail" 
				component={PlanDetailScreen}
				options={{
					animation: 'slide_from_right',
				}}
			/>
			<AppStack.Screen 
				name="Chat" 
				component={ChatScreen}
				options={{
					animation: 'slide_from_right',
				}}
			/>
		</AppStack.Navigator>
	)
}

