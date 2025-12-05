/**
 * TrainerSettingsScreen - Pełny ekran ustawień trenera
 *
 * Zawiera wszystkie opcje i funkcje potrzebne trenerowi.
 */

import React, { useCallback, useState, useMemo } from 'react'
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	Alert,
	Switch,
	Modal,
	TextInput,
	ActivityIndicator,
	Share,
	Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../context/AuthContext'
import { useTrainerClients } from '../../api/services/clients'
import { useTrainerPlans } from '../../api/services/trainingPlans'
import { useExercises } from '../../api/services/exercises'
import { supabase } from '../../api/supabase'
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
			{title && <Text style={styles.sectionTitle}>{title}</Text>}
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
	description?: string
	onPress?: () => void
	isSwitch?: boolean
	switchValue?: boolean
	onSwitchChange?: (value: boolean) => void
	isDestructive?: boolean
	isLast?: boolean
	badge?: number
}

function SettingsOption({
	icon,
	iconColor = colors.textSecondary,
	label,
	value,
	description,
	onPress,
	isSwitch,
	switchValue,
	onSwitchChange,
	isDestructive,
	isLast,
	badge,
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
				<View style={styles.optionTextContainer}>
					<Text style={[styles.optionLabel, isDestructive && styles.optionLabelDestructive]}>{label}</Text>
					{description && <Text style={styles.optionDescription}>{description}</Text>}
				</View>
			</View>
			<View style={styles.optionRight}>
				{badge !== undefined && badge > 0 && (
					<View style={styles.badge}>
						<Text style={styles.badgeText}>{badge}</Text>
					</View>
				)}
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
					<Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
				) : null}
			</View>
		</TouchableOpacity>
	)
}

// ============================================
// MODAL ZMIANY HASŁA
// ============================================

interface ChangePasswordModalProps {
	visible: boolean
	onClose: () => void
}

function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [showNew, setShowNew] = useState(false)

	const handleSave = async () => {
		if (newPassword !== confirmPassword) {
			Alert.alert('Błąd', 'Nowe hasła nie są takie same')
			return
		}
		if (newPassword.length < 6) {
			Alert.alert('Błąd', 'Hasło musi mieć minimum 6 znaków')
			return
		}

		setIsLoading(true)
		try {
			const { error } = await supabase.auth.updateUser({
				password: newPassword,
			})

			if (error) throw error

			Alert.alert('Sukces', 'Hasło zostało zmienione')
			handleClose()
		} catch (error: any) {
			Alert.alert('Błąd', error.message || 'Nie udało się zmienić hasła')
		} finally {
			setIsLoading(false)
		}
	}

	const handleClose = () => {
		setNewPassword('')
		setConfirmPassword('')
		onClose()
	}

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<SafeAreaView style={styles.modalContainer}>
				<View style={styles.modalHeader}>
					<TouchableOpacity onPress={handleClose}>
						<Text style={styles.modalCancel}>Anuluj</Text>
					</TouchableOpacity>
					<Text style={styles.modalTitle}>Zmień hasło</Text>
					<TouchableOpacity onPress={handleSave} disabled={isLoading}>
						{isLoading ? (
							<ActivityIndicator size="small" color={colors.primary} />
						) : (
							<Text style={styles.modalSave}>Zapisz</Text>
						)}
					</TouchableOpacity>
				</View>

				<ScrollView style={styles.modalContent}>
					<View style={styles.inputGroup}>
						<Text style={styles.inputLabel}>Nowe hasło</Text>
						<View style={styles.passwordInputContainer}>
							<TextInput
								style={styles.passwordInput}
								value={newPassword}
								onChangeText={setNewPassword}
								placeholder="Minimum 6 znaków"
								placeholderTextColor={colors.textDisabled}
								secureTextEntry={!showNew}
								autoCapitalize="none"
							/>
							<TouchableOpacity onPress={() => setShowNew(!showNew)}>
								<Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
							</TouchableOpacity>
						</View>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.inputLabel}>Potwierdź nowe hasło</Text>
						<TextInput
							style={styles.input}
							value={confirmPassword}
							onChangeText={setConfirmPassword}
							placeholder="Powtórz hasło"
							placeholderTextColor={colors.textDisabled}
							secureTextEntry
							autoCapitalize="none"
						/>
					</View>

					<Text style={styles.passwordHint}>
						💡 Hasło powinno zawierać minimum 6 znaków. Zalecamy użycie kombinacji liter, cyfr i znaków specjalnych.
					</Text>
				</ScrollView>
			</SafeAreaView>
		</Modal>
	)
}

// ============================================
// MODAL EDYCJI PROFILU
// ============================================

interface EditProfileModalProps {
	visible: boolean
	onClose: () => void
	profile: any
}

function EditProfileModal({ visible, onClose, profile }: EditProfileModalProps) {
	const [firstName, setFirstName] = useState(profile?.first_name || '')
	const [lastName, setLastName] = useState(profile?.last_name || '')
	const [phone, setPhone] = useState(profile?.phone || '')
	const [bio, setBio] = useState(profile?.bio || '')
	const [isLoading, setIsLoading] = useState(false)

	const handleSave = async () => {
		if (!firstName.trim() || !lastName.trim()) {
			Alert.alert('Błąd', 'Imię i nazwisko są wymagane')
			return
		}

		setIsLoading(true)
		try {
			const { error } = await supabase
				.from('profiles')
				.update({
					first_name: firstName.trim(),
					last_name: lastName.trim(),
					phone: phone.trim() || null,
					bio: bio.trim() || null,
					updated_at: new Date().toISOString(),
				})
				.eq('id', profile.id)

			if (error) throw error

			Alert.alert('Sukces', 'Profil został zaktualizowany')
			onClose()
		} catch (error: any) {
			Alert.alert('Błąd', error.message || 'Nie udało się zaktualizować profilu')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<SafeAreaView style={styles.modalContainer}>
				<View style={styles.modalHeader}>
					<TouchableOpacity onPress={onClose}>
						<Text style={styles.modalCancel}>Anuluj</Text>
					</TouchableOpacity>
					<Text style={styles.modalTitle}>Edytuj profil</Text>
					<TouchableOpacity onPress={handleSave} disabled={isLoading}>
						{isLoading ? (
							<ActivityIndicator size="small" color={colors.primary} />
						) : (
							<Text style={styles.modalSave}>Zapisz</Text>
						)}
					</TouchableOpacity>
				</View>

				<ScrollView style={styles.modalContent}>
					<View style={styles.avatarEditContainer}>
						<View style={styles.avatarLarge}>
							<Text style={styles.avatarLargeText}>
								{firstName?.charAt(0)}
								{lastName?.charAt(0)}
							</Text>
						</View>
						<TouchableOpacity style={styles.changePhotoButton}>
							<Ionicons name="camera" size={16} color={colors.primary} />
							<Text style={styles.changePhotoText}>Zmień zdjęcie</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.inputLabel}>Imię *</Text>
						<TextInput
							style={styles.input}
							value={firstName}
							onChangeText={setFirstName}
							placeholder="Twoje imię"
							placeholderTextColor={colors.textDisabled}
						/>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.inputLabel}>Nazwisko *</Text>
						<TextInput
							style={styles.input}
							value={lastName}
							onChangeText={setLastName}
							placeholder="Twoje nazwisko"
							placeholderTextColor={colors.textDisabled}
						/>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.inputLabel}>Telefon</Text>
						<TextInput
							style={styles.input}
							value={phone}
							onChangeText={setPhone}
							placeholder="+48 123 456 789"
							placeholderTextColor={colors.textDisabled}
							keyboardType="phone-pad"
						/>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.inputLabel}>O mnie</Text>
						<TextInput
							style={[styles.input, styles.bioInput]}
							value={bio}
							onChangeText={setBio}
							placeholder="Krótki opis, specjalizacje, doświadczenie..."
							placeholderTextColor={colors.textDisabled}
							multiline
							numberOfLines={4}
						/>
					</View>
				</ScrollView>
			</SafeAreaView>
		</Modal>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function TrainerSettingsScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const { profile, currentUser, logout, deleteAccount, refreshProfile } = useAuth()

	// Dane
	const { data: clients = [] } = useTrainerClients(profile?.id || '')
	const { data: plans = [] } = useTrainerPlans(profile?.id || '')
	const { data: exercises = [] } = useExercises()

	// Stan
	const [notificationsEnabled, setNotificationsEnabled] = useState(true)
	const [emailNotifications, setEmailNotifications] = useState(true)
	const [clientUpdates, setClientUpdates] = useState(true)
	const [isLoggingOut, setIsLoggingOut] = useState(false)
	const [showPasswordModal, setShowPasswordModal] = useState(false)
	const [showProfileModal, setShowProfileModal] = useState(false)

	// Statystyki
	const stats = useMemo(
		() => ({
			activeClients: clients.filter(c => c.is_active).length,
			totalClients: clients.length,
			activePlans: plans.filter(p => p.is_active).length,
			totalPlans: plans.length,
			totalExercises: exercises.length,
		}),
		[clients, plans, exercises]
	)

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
			'⚠️ Usuń konto',
			'Ta operacja jest NIEODWRACALNA!\n\nZostanie usunięte:\n• Twój profil\n• Wszyscy klienci\n• Wszystkie plany treningowe\n• Wszystkie ćwiczenia\n• Historia wiadomości',
			[
				{ text: 'Anuluj', style: 'cancel' },
				{
					text: 'Usuń konto',
					style: 'destructive',
					onPress: () => {
						Alert.prompt(
							'Potwierdź usunięcie',
							'Wpisz "USUŃ" aby potwierdzić',
							[
								{ text: 'Anuluj', style: 'cancel' },
								{
									text: 'Potwierdź',
									style: 'destructive',
									onPress: async (text?: string) => {
										if (text?.toUpperCase() === 'USUŃ') {
											try {
												await deleteAccount()
											} catch (error: any) {
												Alert.alert('Błąd', error.message)
											}
										} else {
											Alert.alert('Błąd', 'Nieprawidłowe potwierdzenie')
										}
									},
								},
							],
							'plain-text'
						)
					},
				},
			]
		)
	}, [deleteAccount])

	const handleInviteClient = useCallback(() => {
		navigation.navigate('AddClient')
	}, [navigation])

	const handleManageExercises = useCallback(() => {
		// Przejdź do biblioteki ćwiczeń
		Alert.alert('Biblioteka ćwiczeń', 'Przejdź do zakładki "Ćwiczenia" aby zarządzać biblioteką')
	}, [])

	const handleExportData = useCallback(async () => {
		Alert.alert('Eksport danych', 'Wybierz co chcesz wyeksportować:', [
			{ text: 'Anuluj', style: 'cancel' },
			{
				text: 'Lista klientów (CSV)',
				onPress: () => {
					const csv = clients.map(c => `${c.first_name},${c.last_name},${c.email}`).join('\n')
					Share.share({
						message: `Imię,Nazwisko,Email\n${csv}`,
						title: 'Lista klientów',
					})
				},
			},
			{
				text: 'Wszystkie dane (JSON)',
				onPress: () => {
					const data = {
						exportDate: new Date().toISOString(),
						trainer: {
							name: `${profile?.first_name} ${profile?.last_name}`,
							email: profile?.email,
						},
						clients: clients.map(c => ({
							name: `${c.first_name} ${c.last_name}`,
							email: c.email,
						})),
						plansCount: plans.length,
						exercisesCount: exercises.length,
					}
					Share.share({
						message: JSON.stringify(data, null, 2),
						title: 'Eksport danych FitCoach',
					})
				},
			},
		])
	}, [clients, plans, exercises, profile])

	const handleShareApp = useCallback(async () => {
		try {
			await Share.share({
				message: 'Dołącz do FitCoach - najlepszej aplikacji dla trenerów personalnych! 💪\n\nhttps://fitcoach.app',
				title: 'Poleć FitCoach',
			})
		} catch (error) {
			console.error('Błąd udostępniania:', error)
		}
	}, [])

	const handleContact = useCallback(() => {
		Alert.alert('Kontakt', 'Jak chcesz się z nami skontaktować?', [
			{ text: 'Anuluj', style: 'cancel' },
			{
				text: 'Email',
				onPress: () => Linking.openURL('mailto:support@fitcoach.app'),
			},
			{
				text: 'Strona www',
				onPress: () => Linking.openURL('https://fitcoach.app/kontakt'),
			},
		])
	}, [])

	const handlePrivacyPolicy = useCallback(() => {
		Linking.openURL('https://fitcoach.app/polityka-prywatnosci')
	}, [])

	const handleTerms = useCallback(() => {
		Linking.openURL('https://fitcoach.app/regulamin')
	}, [])

	const handleRateApp = useCallback(() => {
		Alert.alert('Oceń aplikację ⭐', 'Czy podoba Ci się FitCoach? Zostaw nam opinię!', [
			{ text: 'Później', style: 'cancel' },
			{
				text: 'Oceń teraz',
				onPress: () => {
					// Link do sklepu (iOS App Store lub Google Play)
					Linking.openURL('https://fitcoach.app/ocen')
				},
			},
		])
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
					<TouchableOpacity style={styles.avatarContainer} onPress={() => setShowProfileModal(true)}>
						<View style={styles.avatar}>
							<Text style={styles.avatarText}>
								{profile?.first_name?.charAt(0)}
								{profile?.last_name?.charAt(0)}
							</Text>
						</View>
						<View style={styles.editAvatarBadge}>
							<Ionicons name="pencil" size={12} color={colors.textOnPrimary} />
						</View>
					</TouchableOpacity>
					<Text style={styles.profileName}>
						{profile?.first_name} {profile?.last_name}
					</Text>
					<Text style={styles.profileEmail}>{profile?.email}</Text>
					<View style={styles.trainerBadge}>
						<Ionicons name="shield-checkmark" size={14} color={colors.primary} />
						<Text style={styles.trainerBadgeText}>Trener personalny</Text>
					</View>
				</View>

				{/* Statystyki rozszerzone */}
				<View style={styles.statsCard}>
					<View style={styles.statsRow}>
						<View style={styles.statItem}>
							<Ionicons name="people" size={24} color={colors.primary} />
							<Text style={styles.statValue}>{stats.activeClients}</Text>
							<Text style={styles.statLabel}>Aktywni</Text>
						</View>
						<View style={styles.statDivider} />
						<View style={styles.statItem}>
							<Ionicons name="calendar" size={24} color={colors.success} />
							<Text style={styles.statValue}>{stats.activePlans}</Text>
							<Text style={styles.statLabel}>Plany</Text>
						</View>
						<View style={styles.statDivider} />
						<View style={styles.statItem}>
							<Ionicons name="barbell" size={24} color={colors.warning} />
							<Text style={styles.statValue}>{stats.totalExercises}</Text>
							<Text style={styles.statLabel}>Ćwiczenia</Text>
						</View>
					</View>
				</View>

				{/* Konto */}
				<SettingsSection title="Konto">
					<SettingsOption
						icon="person"
						iconColor={colors.primary}
						label="Edytuj profil"
						description="Imię, nazwisko, zdjęcie, bio"
						onPress={() => setShowProfileModal(true)}
					/>
					<SettingsOption
						icon="lock-closed"
						iconColor={colors.warning}
						label="Zmień hasło"
						onPress={() => setShowPasswordModal(true)}
					/>
					<SettingsOption
						icon="mail"
						iconColor={colors.textSecondary}
						label="Email"
						value={currentUser?.email}
						isLast
					/>
				</SettingsSection>

				{/* Klienci */}
				<SettingsSection title="Klienci">
					<SettingsOption
						icon="person-add"
						iconColor={colors.success}
						label="Zaproś klienta"
						description="Wyślij zaproszenie email"
						onPress={handleInviteClient}
					/>
					<SettingsOption
						icon="people"
						iconColor={colors.primary}
						label="Moi klienci"
						value={`${stats.totalClients}`}
						onPress={() => Alert.alert('Klienci', 'Przejdź do zakładki "Klienci"')}
						isLast
					/>
				</SettingsSection>

				{/* Narzędzia */}
				<SettingsSection title="Narzędzia">
					<SettingsOption
						icon="barbell"
						iconColor={colors.warning}
						label="Biblioteka ćwiczeń"
						value={`${stats.totalExercises}`}
						onPress={handleManageExercises}
					/>
					<SettingsOption
						icon="download"
						iconColor={colors.success}
						label="Eksportuj dane"
						description="Pobierz listę klientów i planów"
						onPress={handleExportData}
						isLast
					/>
				</SettingsSection>

				{/* Powiadomienia */}
				<SettingsSection title="Powiadomienia">
					<SettingsOption
						icon="notifications"
						iconColor={colors.primary}
						label="Powiadomienia push"
						description="Wiadomości, aktualizacje"
						isSwitch
						switchValue={notificationsEnabled}
						onSwitchChange={setNotificationsEnabled}
					/>
					<SettingsOption
						icon="fitness"
						iconColor={colors.success}
						label="Ukończone treningi"
						description="Gdy klient ukończy trening"
						isSwitch
						switchValue={clientUpdates}
						onSwitchChange={setClientUpdates}
					/>
					<SettingsOption
						icon="mail"
						iconColor={colors.textSecondary}
						label="Powiadomienia email"
						description="Podsumowania tygodniowe"
						isSwitch
						switchValue={emailNotifications}
						onSwitchChange={setEmailNotifications}
						isLast
					/>
				</SettingsSection>

				{/* Udostępnianie */}
				<SettingsSection title="Poleć znajomym">
					<SettingsOption
						icon="share-social"
						iconColor={colors.primary}
						label="Udostępnij aplikację"
						description="Zaproś innych trenerów"
						onPress={handleShareApp}
					/>
					<SettingsOption
						icon="star"
						iconColor={colors.warning}
						label="Oceń aplikację"
						description="Pomóż nam się rozwijać"
						onPress={handleRateApp}
						isLast
					/>
				</SettingsSection>

				{/* Pomoc */}
				<SettingsSection title="Pomoc i informacje">
					<SettingsOption
						icon="help-circle"
						iconColor={colors.primary}
						label="Centrum pomocy"
						description="FAQ, poradniki"
						onPress={handleContact}
					/>
					<SettingsOption
						icon="chatbubbles"
						iconColor={colors.success}
						label="Kontakt z supportem"
						onPress={handleContact}
					/>
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
						value="1.0.0 (build 1)"
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
						description="Nieodwracalne usunięcie wszystkich danych"
						onPress={handleDeleteAccount}
						isDestructive
						isLast
					/>
				</SettingsSection>

				<View style={styles.footerContainer}>
					<Text style={styles.footer}>FitCoach © 2024</Text>
					<Text style={styles.footerSub}>Stworzone z 💪 dla trenerów</Text>
				</View>
			</ScrollView>

			{/* Modals */}
			<ChangePasswordModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
			<EditProfileModal
				visible={showProfileModal}
				onClose={() => {
					setShowProfileModal(false)
					refreshProfile()
				}}
				profile={profile}
			/>
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
	avatarContainer: {
		position: 'relative',
		marginBottom: 12,
	},
	avatar: {
		width: 90,
		height: 90,
		borderRadius: 45,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
	},
	avatarText: {
		fontSize: 32,
		fontWeight: 'bold',
		color: colors.textOnPrimary,
	},
	editAvatarBadge: {
		position: 'absolute',
		right: 0,
		bottom: 0,
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 3,
		borderColor: colors.background,
	},
	profileName: {
		fontSize: 24,
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
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 20,
		marginTop: 14,
		gap: 6,
	},
	trainerBadgeText: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.primary,
	},
	statsCard: {
		backgroundColor: colors.surface,
		marginHorizontal: 16,
		marginBottom: 24,
		padding: 20,
		borderRadius: 16,
	},
	statsRow: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center',
	},
	statItem: {
		alignItems: 'center',
		flex: 1,
	},
	statValue: {
		fontSize: 28,
		fontWeight: 'bold',
		color: colors.textPrimary,
		marginTop: 6,
	},
	statLabel: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 2,
	},
	statDivider: {
		width: 1,
		height: 50,
		backgroundColor: colors.background,
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
		flex: 1,
		gap: 12,
	},
	optionTextContainer: {
		flex: 1,
	},
	iconWrapper: {
		width: 36,
		height: 36,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
	},
	optionLabel: {
		fontSize: 15,
		color: colors.textPrimary,
		fontWeight: '500',
	},
	optionLabelDestructive: {
		color: colors.error,
	},
	optionDescription: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 2,
	},
	optionRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	optionValue: {
		fontSize: 14,
		color: colors.textSecondary,
	},
	badge: {
		backgroundColor: colors.primary,
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 6,
	},
	badgeText: {
		fontSize: 11,
		fontWeight: '600',
		color: colors.textOnPrimary,
	},
	footerContainer: {
		alignItems: 'center',
		marginTop: 20,
		paddingBottom: 20,
	},
	footer: {
		color: colors.textDisabled,
		fontSize: 12,
	},
	footerSub: {
		color: colors.textDisabled,
		fontSize: 11,
		marginTop: 4,
	},
	// Modal styles
	modalContainer: {
		flex: 1,
		backgroundColor: colors.background,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: colors.surface,
	},
	modalTitle: {
		fontSize: 17,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	modalCancel: {
		fontSize: 16,
		color: colors.textSecondary,
	},
	modalSave: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.primary,
	},
	modalContent: {
		flex: 1,
		padding: 16,
	},
	avatarEditContainer: {
		alignItems: 'center',
		marginBottom: 24,
	},
	avatarLarge: {
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
	},
	avatarLargeText: {
		fontSize: 36,
		fontWeight: 'bold',
		color: colors.textOnPrimary,
	},
	changePhotoButton: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 12,
		gap: 6,
	},
	changePhotoText: {
		color: colors.primary,
		fontWeight: '500',
	},
	inputGroup: {
		marginBottom: 16,
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: colors.textSecondary,
		marginBottom: 8,
	},
	input: {
		backgroundColor: colors.surface,
		borderRadius: 10,
		padding: 14,
		color: colors.textPrimary,
		fontSize: 15,
	},
	bioInput: {
		minHeight: 100,
		textAlignVertical: 'top',
	},
	passwordInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: 10,
		paddingRight: 14,
	},
	passwordInput: {
		flex: 1,
		padding: 14,
		color: colors.textPrimary,
		fontSize: 15,
	},
	passwordHint: {
		fontSize: 13,
		color: colors.textSecondary,
		lineHeight: 20,
		marginTop: 8,
	},
})
