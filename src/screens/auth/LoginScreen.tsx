/**
 * Ekran logowania FitCoach
 *
 * Umożliwia logowanie użytkownika przy użyciu email i hasła.
 * Walidacja formularza przez React Hook Form + Zod.
 */

import React, { useState } from 'react'
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { AuthStackParamList } from '../../navigation/AuthNavigator'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'

// ============================================
// SCHEMAT WALIDACJI
// ============================================

const loginSchema = z.object({
	email: z.string().min(1, 'Email jest wymagany').email('Nieprawidłowy format email'),
	password: z.string().min(1, 'Hasło jest wymagane').min(6, 'Hasło musi mieć co najmniej 6 znaków'),
})

type LoginFormData = z.infer<typeof loginSchema>

// ============================================
// KOMPONENT
// ============================================

export default function LoginScreen() {
	const navigation = useNavigation<NavigationProp<AuthStackParamList>>()
	const { login } = useAuth()
	const [isLoading, setIsLoading] = useState(false)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	// React Hook Form
	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: '',
			password: '',
		},
	})

	// ============================================
	// OBSŁUGA LOGOWANIA
	// ============================================

	const onSubmit = async (data: LoginFormData) => {
		setIsLoading(true)
		setErrorMessage(null)

		try {
			const result = await login(data.email, data.password)

			if (!result.success) {
				setErrorMessage(result.error?.message || 'Wystąpił błąd podczas logowania')
			}
			// Jeśli sukces, AuthContext automatycznie zaktualizuje stan
			// i nawigacja przekieruje do głównego ekranu
		} catch (error) {
			setErrorMessage('Wystąpił nieoczekiwany błąd. Spróbuj ponownie.')
		} finally {
			setIsLoading(false)
		}
	}

	// ============================================
	// RENDER
	// ============================================

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={{ flex: 1, backgroundColor: colors.background }}>
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					justifyContent: 'center',
					padding: 24,
				}}
				keyboardShouldPersistTaps="handled">
				{/* Logo / Tytuł */}
				<View style={{ alignItems: 'center', marginBottom: 48 }}>
					<Text
						style={{
							fontSize: 42,
							fontWeight: 'bold',
							color: colors.primary,
							letterSpacing: -1,
						}}>
						FitCoach
					</Text>
					<Text
						style={{
							fontSize: 16,
							color: colors.textSecondary,
							marginTop: 8,
						}}>
						Twój osobisty trener
					</Text>
				</View>

				{/* Formularz */}
				<View style={{ gap: 16 }}>
					{/* Email */}
					<View>
						<Text
							style={{
								color: colors.textSecondary,
								fontSize: 14,
								marginBottom: 8,
								fontWeight: '500',
							}}>
							Email
						</Text>
						<Controller
							control={control}
							name="email"
							render={({ field: { onChange, onBlur, value } }) => (
								<TextInput
									style={{
										backgroundColor: colors.surface,
										borderWidth: 1,
										borderColor: errors.email ? colors.error : colors.border,
										borderRadius: 12,
										padding: 16,
										fontSize: 16,
										color: colors.textPrimary,
									}}
									placeholder="twoj@email.pl"
									placeholderTextColor={colors.textDisabled}
									keyboardType="email-address"
									autoCapitalize="none"
									autoCorrect={false}
									onBlur={onBlur}
									onChangeText={onChange}
									value={value}
									editable={!isLoading}
								/>
							)}
						/>
						{errors.email && (
							<Text
								style={{
									color: colors.error,
									fontSize: 12,
									marginTop: 4,
								}}>
								{errors.email.message}
							</Text>
						)}
					</View>

					{/* Hasło */}
					<View>
						<Text
							style={{
								color: colors.textSecondary,
								fontSize: 14,
								marginBottom: 8,
								fontWeight: '500',
							}}>
							Hasło
						</Text>
						<Controller
							control={control}
							name="password"
							render={({ field: { onChange, onBlur, value } }) => (
								<TextInput
									style={{
										backgroundColor: colors.surface,
										borderWidth: 1,
										borderColor: errors.password ? colors.error : colors.border,
										borderRadius: 12,
										padding: 16,
										fontSize: 16,
										color: colors.textPrimary,
									}}
									placeholder="••••••••"
									placeholderTextColor={colors.textDisabled}
									secureTextEntry
									onBlur={onBlur}
									onChangeText={onChange}
									value={value}
									editable={!isLoading}
								/>
							)}
						/>
						{errors.password && (
							<Text
								style={{
									color: colors.error,
									fontSize: 12,
									marginTop: 4,
								}}>
								{errors.password.message}
							</Text>
						)}
					</View>

					{/* Komunikat błędu */}
					{errorMessage && (
						<View
							style={{
								backgroundColor: colors.errorLight,
								padding: 12,
								borderRadius: 8,
								borderWidth: 1,
								borderColor: colors.error,
							}}>
							<Text
								style={{
									color: colors.error,
									fontSize: 14,
									textAlign: 'center',
								}}>
								{errorMessage}
							</Text>
						</View>
					)}

					{/* Przycisk logowania */}
					<TouchableOpacity
						style={{
							backgroundColor: isLoading ? colors.primaryDark : colors.primary,
							paddingVertical: 16,
							borderRadius: 12,
							alignItems: 'center',
							justifyContent: 'center',
							marginTop: 8,
							flexDirection: 'row',
							gap: 8,
						}}
						onPress={handleSubmit(onSubmit)}
						disabled={isLoading}
						activeOpacity={0.8}>
						{isLoading && <ActivityIndicator color={colors.textOnPrimary} size="small" />}
						<Text
							style={{
								color: colors.textOnPrimary,
								fontSize: 18,
								fontWeight: '600',
							}}>
							{isLoading ? 'Logowanie...' : 'Zaloguj się'}
						</Text>
					</TouchableOpacity>

					{/* Link do rejestracji */}
					<View style={{ alignItems: 'center', marginTop: 24 }}>
						<Text style={{ color: colors.textSecondary, fontSize: 14 }}>
							Masz kod zaproszenia?{' '}
							<Text
								style={{ color: colors.primary, fontWeight: '600' }}
								onPress={() => navigation.navigate('Register')}>
								Zarejestruj się
							</Text>
						</Text>
					</View>
				</View>

				{/* Stopka */}
				<View style={{ marginTop: 48, alignItems: 'center' }}>
					<Text
						style={{
							color: colors.textDisabled,
							fontSize: 12,
						}}>
						© 2024 FitCoach. Wszelkie prawa zastrzeżone.
					</Text>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	)
}
