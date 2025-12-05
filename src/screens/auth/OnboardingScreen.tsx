/**
 * Ekran Onboarding FitCoach
 *
 * Wyświetla health disclaimer i wymaga akceptacji
 * regulaminu oraz polityki prywatności przed użyciem aplikacji.
 */

import React, { useState } from 'react'
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Linking,
	Alert,
} from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'

// ============================================
// KOMPONENT CHECKBOX
// ============================================

interface CheckboxProps {
	checked: boolean
	onToggle: () => void
	label: string
	linkText?: string
	onLinkPress?: () => void
	disabled?: boolean
}

function Checkbox({ checked, onToggle, label, linkText, onLinkPress, disabled }: CheckboxProps) {
	return (
		<TouchableOpacity
			style={{
				flexDirection: 'row',
				alignItems: 'flex-start',
				gap: 12,
				paddingVertical: 8,
			}}
			onPress={onToggle}
			disabled={disabled}
			activeOpacity={0.7}>
			{/* Checkbox box */}
			<View
				style={{
					width: 24,
					height: 24,
					borderRadius: 6,
					borderWidth: 2,
					borderColor: checked ? colors.primary : colors.border,
					backgroundColor: checked ? colors.primary : 'transparent',
					alignItems: 'center',
					justifyContent: 'center',
					marginTop: 2,
				}}>
				{checked && (
					<Text style={{ color: colors.textOnPrimary, fontSize: 14, fontWeight: 'bold' }}>✓</Text>
				)}
			</View>

			{/* Label */}
			<View style={{ flex: 1 }}>
				<Text style={{ color: colors.textPrimary, fontSize: 16, lineHeight: 24 }}>
					{label}{' '}
					{linkText && (
						<Text
							style={{ color: colors.primary, textDecorationLine: 'underline' }}
							onPress={onLinkPress}>
							{linkText}
						</Text>
					)}
				</Text>
			</View>
		</TouchableOpacity>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function OnboardingScreen() {
	const { acceptLegal, currentUser } = useAuth()

	const [acceptedTerms, setAcceptedTerms] = useState(false)
	const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
	const [isLoading, setIsLoading] = useState(false)

	// Czy można przejść dalej
	const canProceed = acceptedTerms && acceptedPrivacy

	// ============================================
	// OBSŁUGA LINKÓW
	// ============================================

	const openTerms = () => {
		// TODO: Zamień na prawdziwy URL po deploymencie na Vercel
		const termsUrl = 'https://fitcoach-legal.vercel.app/terms'
		Linking.canOpenURL(termsUrl).then((supported) => {
			if (supported) {
				Linking.openURL(termsUrl)
			} else {
				Alert.alert('Błąd', 'Nie można otworzyć regulaminu')
			}
		})
	}

	const openPrivacy = () => {
		// TODO: Zamień na prawdziwy URL po deploymencie na Vercel
		const privacyUrl = 'https://fitcoach-legal.vercel.app/privacy-policy'
		Linking.canOpenURL(privacyUrl).then((supported) => {
			if (supported) {
				Linking.openURL(privacyUrl)
			} else {
				Alert.alert('Błąd', 'Nie można otworzyć polityki prywatności')
			}
		})
	}

	// ============================================
	// OBSŁUGA AKCEPTACJI
	// ============================================

	const handleProceed = async () => {
		if (!canProceed || !currentUser) return

		setIsLoading(true)

		try {
			const success = await acceptLegal(acceptedTerms, acceptedPrivacy)

			if (!success) {
				Alert.alert('Błąd', 'Nie udało się zapisać akceptacji. Spróbuj ponownie.')
			}
			// Jeśli sukces, AuthContext odświeży dane i nawigacja przekieruje dalej
		} catch (error) {
			Alert.alert('Błąd', 'Wystąpił nieoczekiwany błąd.')
		} finally {
			setIsLoading(false)
		}
	}

	// ============================================
	// RENDER
	// ============================================

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					padding: 24,
					paddingTop: 60,
				}}>
				{/* Tytuł */}
				<View style={{ alignItems: 'center', marginBottom: 32 }}>
					<Text
						style={{
							fontSize: 28,
							fontWeight: 'bold',
							color: colors.textPrimary,
							textAlign: 'center',
						}}>
						Witaj w FitCoach!
					</Text>
					<Text
						style={{
							fontSize: 16,
							color: colors.textSecondary,
							marginTop: 8,
							textAlign: 'center',
						}}>
						Zanim zaczniesz, przeczytaj poniższe informacje
					</Text>
				</View>

				{/* Health Disclaimer */}
				<View
					style={{
						backgroundColor: colors.surface,
						borderRadius: 16,
						padding: 20,
						marginBottom: 24,
						borderWidth: 1,
						borderColor: colors.warning,
					}}>
					{/* Ikona i tytuł */}
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							marginBottom: 16,
							gap: 12,
						}}>
						<Text style={{ fontSize: 32 }}>⚠️</Text>
						<Text
							style={{
								fontSize: 18,
								fontWeight: '600',
								color: colors.warning,
							}}>
							Ważne informacje zdrowotne
						</Text>
					</View>

					{/* Treść disclaimera */}
					<Text
						style={{
							color: colors.textSecondary,
							fontSize: 14,
							lineHeight: 22,
						}}>
						Aplikacja FitCoach służy wyłącznie celom informacyjnym i edukacyjnym. Przed rozpoczęciem
						jakiegokolwiek programu treningowego lub dietetycznego:
					</Text>

					<View style={{ marginTop: 12, gap: 8 }}>
						<Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22 }}>
							• Skonsultuj się z lekarzem lub specjalistą medycznym
						</Text>
						<Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22 }}>
							• Upewnij się, że nie masz przeciwwskazań zdrowotnych
						</Text>
						<Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22 }}>
							• Słuchaj swojego ciała i nie przekraczaj własnych granic
						</Text>
						<Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22 }}>
							• W przypadku bólu lub dyskomfortu przerwij ćwiczenie
						</Text>
					</View>

					<Text
						style={{
							color: colors.textSecondary,
							fontSize: 14,
							lineHeight: 22,
							marginTop: 12,
							fontStyle: 'italic',
						}}>
						Twórcy aplikacji nie ponoszą odpowiedzialności za ewentualne urazy lub problemy
						zdrowotne wynikające z niewłaściwego wykonywania ćwiczeń.
					</Text>
				</View>

				{/* Checkboxy akceptacji */}
				<View
					style={{
						backgroundColor: colors.surface,
						borderRadius: 16,
						padding: 20,
						marginBottom: 24,
					}}>
					<Text
						style={{
							fontSize: 16,
							fontWeight: '600',
							color: colors.textPrimary,
							marginBottom: 16,
						}}>
						Akceptacje wymagane do korzystania z aplikacji:
					</Text>

					<Checkbox
						checked={acceptedTerms}
						onToggle={() => setAcceptedTerms(!acceptedTerms)}
						label="Przeczytałem/am i akceptuję"
						linkText="Regulamin"
						onLinkPress={openTerms}
						disabled={isLoading}
					/>

					<View style={{ height: 8 }} />

					<Checkbox
						checked={acceptedPrivacy}
						onToggle={() => setAcceptedPrivacy(!acceptedPrivacy)}
						label="Przeczytałem/am i akceptuję"
						linkText="Politykę Prywatności"
						onLinkPress={openPrivacy}
						disabled={isLoading}
					/>
				</View>

				{/* Spacer */}
				<View style={{ flex: 1 }} />

				{/* Przycisk Rozpocznij */}
				<TouchableOpacity
					style={{
						backgroundColor: canProceed ? colors.primary : colors.border,
						paddingVertical: 18,
						borderRadius: 12,
						alignItems: 'center',
						justifyContent: 'center',
						flexDirection: 'row',
						gap: 8,
						marginBottom: 24,
					}}
					onPress={handleProceed}
					disabled={!canProceed || isLoading}
					activeOpacity={0.8}>
					{isLoading && <ActivityIndicator color={colors.textOnPrimary} size="small" />}
					<Text
						style={{
							color: canProceed ? colors.textOnPrimary : colors.textDisabled,
							fontSize: 18,
							fontWeight: '600',
						}}>
						{isLoading ? 'Zapisywanie...' : 'Rozpocznij'}
					</Text>
				</TouchableOpacity>

				{/* Informacja */}
				{!canProceed && (
					<Text
						style={{
							color: colors.textSecondary,
							fontSize: 12,
							textAlign: 'center',
							marginBottom: 16,
						}}>
						Zaznacz obie zgody, aby kontynuować
					</Text>
				)}
			</ScrollView>
		</View>
	)
}

