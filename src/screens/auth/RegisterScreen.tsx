/**
 * RegisterScreen - Rejestracja klienta
 *
 * Klient rejestruje się podając kod zaproszenia od trenera.
 */

import React, { useState, useEffect } from 'react'
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../../context/AuthContext'
import { verifyInvitationCode, acceptInvitation } from '../../api/services/invitations'
import { colors } from '../../theme/colors'

// ============================================
// WALIDACJA
// ============================================

const registerSchema = z.object({
	invitation_code: z
		.string()
		.length(6, 'Kod musi mieć 6 znaków')
		.regex(/^[A-Z0-9]+$/, 'Kod może zawierać tylko litery i cyfry'),
	first_name: z
		.string()
		.min(2, 'Imię musi mieć minimum 2 znaki')
		.max(50, 'Imię może mieć maksymalnie 50 znaków'),
	last_name: z
		.string()
		.min(2, 'Nazwisko musi mieć minimum 2 znaki')
		.max(50, 'Nazwisko może mieć maksymalnie 50 znaków'),
	email: z.string().email('Nieprawidłowy adres email'),
	password: z
		.string()
		.min(8, 'Hasło musi mieć minimum 8 znaków')
		.regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
		.regex(/[0-9]/, 'Hasło musi zawierać cyfrę'),
	confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
	message: 'Hasła nie są identyczne',
	path: ['confirm_password'],
})

type RegisterFormData = z.infer<typeof registerSchema>

// ============================================
// KOMPONENT
// ============================================

export default function RegisterScreen() {
	const navigation = useNavigation()
	const { register } = useAuth()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [codeVerified, setCodeVerified] = useState(false)
	const [trainerName, setTrainerName] = useState<string | null>(null)
	const [isVerifyingCode, setIsVerifyingCode] = useState(false)

	const {
		control,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isValid },
	} = useForm<RegisterFormData>({
		resolver: zodResolver(registerSchema),
		mode: 'onChange',
		defaultValues: {
			invitation_code: '',
			first_name: '',
			last_name: '',
			email: '',
			password: '',
			confirm_password: '',
		},
	})

	const invitationCode = watch('invitation_code')

	// Weryfikuj kod gdy ma 6 znaków
	useEffect(() => {
		if (invitationCode.length === 6) {
			verifyCode(invitationCode)
		} else {
			setCodeVerified(false)
			setTrainerName(null)
		}
	}, [invitationCode])

	// ============================================
	// HANDLERS
	// ============================================

	const verifyCode = async (code: string) => {
		setIsVerifyingCode(true)
		try {
			const result = await verifyInvitationCode(code)
			if (result.valid) {
				setCodeVerified(true)
				setTrainerName(result.trainerName || null)
				if (result.email) {
					setValue('email', result.email)
				}
			} else {
				setCodeVerified(false)
				setTrainerName(null)
			}
		} catch (error) {
			setCodeVerified(false)
			setTrainerName(null)
		} finally {
			setIsVerifyingCode(false)
		}
	}

	const onSubmit = async (data: RegisterFormData) => {
		if (!codeVerified) {
			Alert.alert('Błąd', 'Wprowadź poprawny kod zaproszenia')
			return
		}

		setIsSubmitting(true)

		try {
			// Rejestracja użytkownika
			const result = await register(
				data.email,
				data.password,
				data.first_name,
				data.last_name,
				data.invitation_code
			)

			if (result.success) {
				Alert.alert(
					'Rejestracja udana! 🎉',
					'Twoje konto zostało utworzone. Możesz się teraz zalogować.',
					[{ text: 'OK' }]
				)
			} else {
				Alert.alert('Błąd rejestracji', result.error || 'Nie udało się utworzyć konta')
			}
		} catch (error: any) {
			Alert.alert('Błąd', error?.message || 'Wystąpił błąd podczas rejestracji')
		} finally {
			setIsSubmitting(false)
		}
	}

	// ============================================
	// RENDER
	// ============================================

	return (
		<SafeAreaView style={styles.container} edges={['top', 'bottom']}>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled">
					{/* Header */}
					<View style={styles.header}>
						<TouchableOpacity
							onPress={() => navigation.goBack()}
							style={styles.backButton}>
							<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
						</TouchableOpacity>
						<Text style={styles.title}>Rejestracja</Text>
						<Text style={styles.subtitle}>
							Dołącz do FitCoach i rozpocznij treningi z trenerem
						</Text>
					</View>

					{/* Kod zaproszenia */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Kod zaproszenia *</Text>
						<Controller
							control={control}
							name="invitation_code"
							render={({ field: { onChange, onBlur, value } }) => (
								<View style={styles.codeInputContainer}>
									<TextInput
										style={[
											styles.codeInput,
											errors.invitation_code && styles.inputError,
											codeVerified && styles.inputSuccess,
										]}
										placeholder="XXXXXX"
										placeholderTextColor={colors.textSecondary}
										value={value}
										onChangeText={(text) => onChange(text.toUpperCase())}
										onBlur={onBlur}
										maxLength={6}
										autoCapitalize="characters"
									/>
									{isVerifyingCode && (
										<ActivityIndicator
											size="small"
											color={colors.primary}
											style={styles.codeLoader}
										/>
									)}
									{codeVerified && !isVerifyingCode && (
										<Ionicons
											name="checkmark-circle"
											size={24}
											color={colors.success}
											style={styles.codeIcon}
										/>
									)}
								</View>
							)}
						/>
						{errors.invitation_code && (
							<Text style={styles.errorText}>{errors.invitation_code.message}</Text>
						)}
						{codeVerified && trainerName && (
							<View style={styles.trainerInfo}>
								<Ionicons name="person" size={16} color={colors.success} />
								<Text style={styles.trainerText}>Trener: {trainerName}</Text>
							</View>
						)}
						{invitationCode.length === 6 && !codeVerified && !isVerifyingCode && (
							<Text style={styles.errorText}>Nieprawidłowy lub wygasły kod</Text>
						)}
					</View>

					{/* Formularz - pokazuj tylko po weryfikacji kodu */}
					{codeVerified && (
						<>
							{/* Imię */}
							<View style={styles.formGroup}>
								<Text style={styles.label}>Imię *</Text>
								<Controller
									control={control}
									name="first_name"
									render={({ field: { onChange, onBlur, value } }) => (
										<TextInput
											style={[styles.input, errors.first_name && styles.inputError]}
											placeholder="Jan"
											placeholderTextColor={colors.textSecondary}
											value={value}
											onChangeText={onChange}
											onBlur={onBlur}
											autoCapitalize="words"
										/>
									)}
								/>
								{errors.first_name && (
									<Text style={styles.errorText}>{errors.first_name.message}</Text>
								)}
							</View>

							{/* Nazwisko */}
							<View style={styles.formGroup}>
								<Text style={styles.label}>Nazwisko *</Text>
								<Controller
									control={control}
									name="last_name"
									render={({ field: { onChange, onBlur, value } }) => (
										<TextInput
											style={[styles.input, errors.last_name && styles.inputError]}
											placeholder="Kowalski"
											placeholderTextColor={colors.textSecondary}
											value={value}
											onChangeText={onChange}
											onBlur={onBlur}
											autoCapitalize="words"
										/>
									)}
								/>
								{errors.last_name && (
									<Text style={styles.errorText}>{errors.last_name.message}</Text>
								)}
							</View>

							{/* Email */}
							<View style={styles.formGroup}>
								<Text style={styles.label}>Email *</Text>
								<Controller
									control={control}
									name="email"
									render={({ field: { onChange, onBlur, value } }) => (
										<TextInput
											style={[styles.input, errors.email && styles.inputError]}
											placeholder="jan@example.com"
											placeholderTextColor={colors.textSecondary}
											value={value}
											onChangeText={onChange}
											onBlur={onBlur}
											keyboardType="email-address"
											autoCapitalize="none"
											autoCorrect={false}
										/>
									)}
								/>
								{errors.email && (
									<Text style={styles.errorText}>{errors.email.message}</Text>
								)}
							</View>

							{/* Hasło */}
							<View style={styles.formGroup}>
								<Text style={styles.label}>Hasło *</Text>
								<Controller
									control={control}
									name="password"
									render={({ field: { onChange, onBlur, value } }) => (
										<View style={styles.passwordContainer}>
											<TextInput
												style={[
													styles.input,
													styles.passwordInput,
													errors.password && styles.inputError,
												]}
												placeholder="Minimum 8 znaków"
												placeholderTextColor={colors.textSecondary}
												value={value}
												onChangeText={onChange}
												onBlur={onBlur}
												secureTextEntry={!showPassword}
												autoCapitalize="none"
											/>
											<TouchableOpacity
												style={styles.passwordToggle}
												onPress={() => setShowPassword(!showPassword)}>
												<Ionicons
													name={showPassword ? 'eye-off' : 'eye'}
													size={22}
													color={colors.textSecondary}
												/>
											</TouchableOpacity>
										</View>
									)}
								/>
								{errors.password && (
									<Text style={styles.errorText}>{errors.password.message}</Text>
								)}
							</View>

							{/* Potwierdź hasło */}
							<View style={styles.formGroup}>
								<Text style={styles.label}>Potwierdź hasło *</Text>
								<Controller
									control={control}
									name="confirm_password"
									render={({ field: { onChange, onBlur, value } }) => (
										<TextInput
											style={[
												styles.input,
												errors.confirm_password && styles.inputError,
											]}
											placeholder="Powtórz hasło"
											placeholderTextColor={colors.textSecondary}
											value={value}
											onChangeText={onChange}
											onBlur={onBlur}
											secureTextEntry={!showPassword}
											autoCapitalize="none"
										/>
									)}
								/>
								{errors.confirm_password && (
									<Text style={styles.errorText}>{errors.confirm_password.message}</Text>
								)}
							</View>

							{/* Przycisk rejestracji */}
							<TouchableOpacity
								style={[
									styles.submitButton,
									(!isValid || isSubmitting) && styles.submitButtonDisabled,
								]}
								onPress={handleSubmit(onSubmit)}
								disabled={!isValid || isSubmitting}
								activeOpacity={0.8}>
								{isSubmitting ? (
									<ActivityIndicator color={colors.textOnPrimary} />
								) : (
									<Text style={styles.submitButtonText}>Zarejestruj się</Text>
								)}
							</TouchableOpacity>
						</>
					)}

					{/* Link do logowania */}
					<View style={styles.loginLink}>
						<Text style={styles.loginLinkText}>Masz już konto? </Text>
						<TouchableOpacity onPress={() => navigation.goBack()}>
							<Text style={styles.loginLinkButton}>Zaloguj się</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
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
		padding: 24,
		paddingBottom: 40,
	},
	header: {
		marginBottom: 32,
	},
	backButton: {
		marginBottom: 16,
	},
	title: {
		fontSize: 32,
		fontWeight: 'bold',
		color: colors.textPrimary,
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: colors.textSecondary,
		lineHeight: 22,
	},
	formGroup: {
		marginBottom: 20,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.textPrimary,
		marginBottom: 8,
	},
	input: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		color: colors.textPrimary,
	},
	inputError: {
		borderColor: colors.error,
	},
	inputSuccess: {
		borderColor: colors.success,
	},
	codeInputContainer: {
		position: 'relative',
	},
	codeInput: {
		backgroundColor: colors.surface,
		borderWidth: 2,
		borderColor: colors.border,
		borderRadius: 12,
		padding: 16,
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.textPrimary,
		textAlign: 'center',
		letterSpacing: 8,
	},
	codeLoader: {
		position: 'absolute',
		right: 16,
		top: '50%',
		marginTop: -10,
	},
	codeIcon: {
		position: 'absolute',
		right: 16,
		top: '50%',
		marginTop: -12,
	},
	trainerInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
		gap: 6,
	},
	trainerText: {
		color: colors.success,
		fontSize: 14,
		fontWeight: '500',
	},
	passwordContainer: {
		position: 'relative',
	},
	passwordInput: {
		paddingRight: 50,
	},
	passwordToggle: {
		position: 'absolute',
		right: 16,
		top: '50%',
		marginTop: -11,
	},
	errorText: {
		color: colors.error,
		fontSize: 12,
		marginTop: 4,
	},
	submitButton: {
		backgroundColor: colors.primary,
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 8,
	},
	submitButtonDisabled: {
		opacity: 0.5,
	},
	submitButtonText: {
		color: colors.textOnPrimary,
		fontSize: 16,
		fontWeight: '600',
	},
	loginLink: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginTop: 24,
	},
	loginLinkText: {
		color: colors.textSecondary,
		fontSize: 14,
	},
	loginLinkButton: {
		color: colors.primary,
		fontSize: 14,
		fontWeight: '600',
	},
})

