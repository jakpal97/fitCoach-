/**
 * ClientSettingsScreen - Ekran ustawień klienta
 *
 * Zawiera opcje profilu, powiadomienia, wylogowanie.
 */

import React, { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'

// ============================================
// KOMPONENT SEKCJI
// ============================================

interface SettingsSectionProps {
	title: string
	children: React.ReactNode
}

function SettingsSection({ title, children }: SettingsSectionProps) {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>{title}</Text>
			<View style={styles.sectionContent}>{children}</View>
		</View>
	)
}

// ============================================
// KOMPONENT OPCJI
// ============================================

interface SettingsOptionProps {
	icon: string
	iconColor?: string
	label: string
	value?: string
	onPress?: () => void
	isSwitch?: boolean
	switchValue?: boolean
	onSwitchChange?: (value: boolean) => void
	isDestructive?: boolean
	isLast?: boolean
}

function SettingsOption({
	icon,
	iconColor = colors.textSecondary,
	label,
	value,
	onPress,
	isSwitch,
	switchValue,
	onSwitchChange,
	isDestructive,
	isLast,
}: SettingsOptionProps) {
	return (
		<TouchableOpacity
			style={[styles.option, isLast && styles.optionLast]}
			onPress={onPress}
			disabled={isSwitch}
			activeOpacity={0.7}>
			<View style={styles.optionLeft}>
				<View style={[styles.iconWrapper, { backgroundColor: iconColor + '20' }]}>
					<Ionicons name={icon as any} size={18} color={iconColor} />
				</View>
				<Text style={[styles.optionLabel, isDestructive && styles.optionLabelDestructive]}>{label}</Text>
			</View>
			{isSwitch ? (
				<Switch
					value={switchValue}
					onValueChange={onSwitchChange}
					trackColor={{ false: colors.surface, true: colors.primary }}
					thumbColor={colors.textOnPrimary}
				/>
			) : value ? (
				<Text style={styles.optionValue}>{value}</Text>
			) : onPress ? (
				<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
			) : null}
		</TouchableOpacity>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function ClientSettingsScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const { profile, clientData, logout, deleteAccount } = useAuth()

	const [notificationsEnabled, setNotificationsEnabled] = useState(true)
	const [reminderEnabled, setReminderEnabled] = useState(true)
	const [isLoggingOut, setIsLoggingOut] = useState(false)

	// ============================================
	// HANDLERS
	// ============================================

	const handleLogout = useCallback(() => {
		Alert.alert('Wyloguj się', 'Czy na pewno chcesz się wylogować?', [
			{ text: 'Anuluj', style: 'cancel' },
			{
				text: 'Wyloguj',
				onPress: async () => {
					setIsLoggingOut(true)
					try {
						await logout()
					} catch (error: any) {
						Alert.alert('Błąd', error.message || 'Nie udało się wylogować')
					} finally {
						setIsLoggingOut(false)
					}
				},
			},
		])
	}, [logout])

	const handleDeleteAccount = useCallback(() => {
		Alert.alert(
			'Usuń konto',
			'Czy na pewno chcesz usunąć swoje konto? Ta operacja jest nieodwracalna i wszystkie Twoje dane zostaną utracone.',
			[
				{ text: 'Anuluj', style: 'cancel' },
				{
					text: 'Usuń konto',
					style: 'destructive',
					onPress: () => {
						Alert.alert('Potwierdź usunięcie', 'Napisz "USUŃ" aby potwierdzić usunięcie konta', [
							{ text: 'Anuluj', style: 'cancel' },
							{
								text: 'Usuń',
								style: 'destructive',
								onPress: async () => {
									try {
										await deleteAccount()
									} catch (error: any) {
										Alert.alert('Błąd', error.message || 'Nie udało się usunąć konta')
									}
								},
							},
						])
					},
				},
			]
		)
	}, [deleteAccount])

	const handleContactTrainer = useCallback(() => {
		if (profile?.trainer_id) {
			navigation.navigate('Chat', { recipientId: profile.trainer_id })
		} else {
			Alert.alert('Brak trenera', 'Nie masz przypisanego trenera')
		}
	}, [profile?.trainer_id, navigation])

	const handleEditProfile = useCallback(() => {
		Alert.alert('Edycja profilu', 'Funkcja edycji profilu wkrótce!')
	}, [])

	const handlePrivacyPolicy = useCallback(() => {
		Alert.alert('Polityka prywatności', 'Otworzy się strona z polityką prywatności')
	}, [])

	const handleTerms = useCallback(() => {
		Alert.alert('Regulamin', 'Otworzy się strona z regulaminem')
	}, [])

	// ============================================
	// RENDER
	// ============================================

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}>
				{/* Header z profilem */}
				<View style={styles.profileHeader}>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>
							{profile?.first_name?.charAt(0)}
							{profile?.last_name?.charAt(0)}
						</Text>
					</View>
					<Text style={styles.profileName}>
						{profile?.first_name} {profile?.last_name}
					</Text>
					<Text style={styles.profileEmail}>{profile?.email}</Text>
					{profile?.trainer_id && (
						<View style={styles.trainerBadge}>
							<Ionicons name="fitness" size={14} color={colors.primary} />
							<Text style={styles.trainerBadgeText}>Klient FitCoach</Text>
						</View>
					)}
				</View>

				{/* Konto */}
				<SettingsSection title="Konto">
					<SettingsOption icon="person" iconColor={colors.primary} label="Edytuj profil" onPress={handleEditProfile} />
					<SettingsOption
						icon="chatbubble"
						iconColor={colors.success}
						label="Napisz do trenera"
						onPress={handleContactTrainer}
						isLast
					/>
				</SettingsSection>

				{/* Powiadomienia */}
				<SettingsSection title="Powiadomienia">
					<SettingsOption
						icon="notifications"
						iconColor={colors.warning}
						label="Powiadomienia push"
						isSwitch
						switchValue={notificationsEnabled}
						onSwitchChange={setNotificationsEnabled}
					/>
					<SettingsOption
						icon="alarm"
						iconColor={colors.primary}
						label="Przypomnienia o treningu"
						isSwitch
						switchValue={reminderEnabled}
						onSwitchChange={setReminderEnabled}
						isLast
					/>
				</SettingsSection>

				{/* Dane treningowe */}
				{clientData && (
					<SettingsSection title="Dane treningowe">
						{clientData.height_cm && (
							<SettingsOption
								icon="resize"
								iconColor={colors.textSecondary}
								label="Wzrost"
								value={`${clientData.height_cm} cm`}
							/>
						)}
						{clientData.current_weight_kg && (
							<SettingsOption
								icon="scale"
								iconColor={colors.textSecondary}
								label="Aktualna waga"
								value={`${clientData.current_weight_kg} kg`}
							/>
						)}
						{clientData.goal_weight_kg && (
							<SettingsOption
								icon="flag"
								iconColor={colors.success}
								label="Waga docelowa"
								value={`${clientData.goal_weight_kg} kg`}
							/>
						)}
						<SettingsOption
							icon="trophy"
							iconColor={colors.warning}
							label="Cel treningowy"
							value={
								clientData.fitness_goal === 'weight_loss'
									? 'Redukcja'
									: clientData.fitness_goal === 'muscle_gain'
									? 'Masa'
									: clientData.fitness_goal === 'maintenance'
									? 'Utrzymanie'
									: clientData.fitness_goal === 'endurance'
									? 'Wytrzymałość'
									: clientData.fitness_goal === 'flexibility'
									? 'Elastyczność'
									: clientData.fitness_goal === 'general_fitness'
									? 'Ogólna forma'
									: 'Brak'
							}
							isLast
						/>
					</SettingsSection>
				)}

				{/* Informacje */}
				<SettingsSection title="Informacje">
					<SettingsOption
						icon="document-text"
						iconColor={colors.textSecondary}
						label="Regulamin"
						onPress={handleTerms}
					/>
					<SettingsOption
						icon="shield-checkmark"
						iconColor={colors.textSecondary}
						label="Polityka prywatności"
						onPress={handlePrivacyPolicy}
					/>
					<SettingsOption
						icon="information-circle"
						iconColor={colors.textSecondary}
						label="Wersja aplikacji"
						value="1.0.0"
						isLast
					/>
				</SettingsSection>

				{/* Wyloguj / Usuń konto */}
				<SettingsSection title="">
					<SettingsOption
						icon="log-out"
						iconColor={colors.warning}
						label={isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj się'}
						onPress={handleLogout}
					/>
					<SettingsOption
						icon="trash"
						iconColor={colors.error}
						label="Usuń konto"
						onPress={handleDeleteAccount}
						isDestructive
						isLast
					/>
				</SettingsSection>

				<Text style={styles.footer}>FitCoach © 2024</Text>
			</ScrollView>
		</SafeAreaView>
	)
}

// ============================================
// STYLE
// ============================================

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 40,
	},
	profileHeader: {
		alignItems: 'center',
		paddingVertical: 30,
		paddingHorizontal: 20,
	},
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 12,
	},
	avatarText: {
		fontSize: 28,
		fontWeight: 'bold',
		color: colors.textOnPrimary,
	},
	profileName: {
		fontSize: 22,
		fontWeight: 'bold',
		color: colors.textPrimary,
	},
	profileEmail: {
		fontSize: 14,
		color: colors.textSecondary,
		marginTop: 4,
	},
	trainerBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.primary + '20',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		marginTop: 12,
		gap: 6,
	},
	trainerBadgeText: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.primary,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.textSecondary,
		marginLeft: 16,
		marginBottom: 8,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	sectionContent: {
		backgroundColor: colors.surface,
		marginHorizontal: 16,
		borderRadius: 12,
		overflow: 'hidden',
	},
	option: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 14,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: colors.background,
	},
	optionLast: {
		borderBottomWidth: 0,
	},
	optionLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	iconWrapper: {
		width: 32,
		height: 32,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	optionLabel: {
		fontSize: 15,
		color: colors.textPrimary,
	},
	optionLabelDestructive: {
		color: colors.error,
	},
	optionValue: {
		fontSize: 14,
		color: colors.textSecondary,
	},
	footer: {
		textAlign: 'center',
		color: colors.textTertiary,
		fontSize: 12,
		marginTop: 20,
	},
})
