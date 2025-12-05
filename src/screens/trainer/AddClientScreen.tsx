/**
 * AddClientScreen - Zapraszanie klientów
 *
 * Trener wpisuje email klienta, system generuje kod zaproszenia.
 * Klient rejestruje się używając kodu i jest automatycznie przypisany.
 */

import React, { useState } from 'react'
import {
	View,
	Text,
	TextInput,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Alert,
	Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Clipboard from 'expo-clipboard'
import { useAuth } from '../../context/AuthContext'
import {
	useTrainerInvitations,
	useCreateInvitation,
	useCancelInvitation,
	useResendInvitation,
	type Invitation,
} from '../../api/services/invitations'
import { colors } from '../../theme/colors'

// ============================================
// KOMPONENT KARTY ZAPROSZENIA
// ============================================

interface InvitationCardProps {
	invitation: Invitation
	onCopy: () => void
	onShare: () => void
	onCancel: () => void
	onResend: () => void
}

function InvitationCard({ invitation, onCopy, onShare, onCancel, onResend }: InvitationCardProps) {
	const isExpired = new Date(invitation.expires_at) < new Date()
	const isPending = invitation.status === 'pending' && !isExpired
	const isAccepted = invitation.status === 'accepted'

	const statusConfig = {
		pending: { color: colors.warning, label: 'Oczekuje', icon: 'time' },
		accepted: { color: colors.success, label: 'Zaakceptowane', icon: 'checkmark-circle' },
		expired: { color: colors.textTertiary, label: 'Wygasłe', icon: 'close-circle' },
	}

	const status = isExpired && invitation.status === 'pending' ? 'expired' : invitation.status
	const config = statusConfig[status]

	return (
		<View style={styles.invitationCard}>
			<View style={styles.invitationHeader}>
				<Text style={styles.invitationEmail}>{invitation.client_email}</Text>
				<View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
					<Ionicons name={config.icon as any} size={14} color={config.color} />
					<Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
				</View>
			</View>

			{isPending && (
				<>
					{/* Kod zaproszenia */}
					<View style={styles.codeContainer}>
						<Text style={styles.codeLabel}>Kod zaproszenia:</Text>
						<Text style={styles.codeValue}>{invitation.invitation_code}</Text>
					</View>

					{/* Akcje */}
					<View style={styles.actionsRow}>
						<TouchableOpacity style={styles.actionButton} onPress={onCopy}>
							<Ionicons name="copy-outline" size={18} color={colors.primary} />
							<Text style={styles.actionText}>Kopiuj</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.actionButton} onPress={onShare}>
							<Ionicons name="share-outline" size={18} color={colors.primary} />
							<Text style={styles.actionText}>Udostępnij</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.actionButton} onPress={onCancel}>
							<Ionicons name="close-outline" size={18} color={colors.error} />
							<Text style={[styles.actionText, { color: colors.error }]}>Anuluj</Text>
						</TouchableOpacity>
					</View>

					{/* Data wygaśnięcia */}
					<Text style={styles.expiresText}>
						Wygasa: {new Date(invitation.expires_at).toLocaleDateString('pl-PL')}
					</Text>
				</>
			)}

			{status === 'expired' && (
				<TouchableOpacity style={styles.resendButton} onPress={onResend}>
					<Ionicons name="refresh" size={16} color={colors.primary} />
					<Text style={styles.resendText}>Wyślij ponownie</Text>
				</TouchableOpacity>
			)}

			{isAccepted && (
				<Text style={styles.acceptedText}>
					Zaakceptowano: {new Date(invitation.accepted_at!).toLocaleDateString('pl-PL')}
				</Text>
			)}
		</View>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function AddClientScreen() {
	const navigation = useNavigation()
	const { profile } = useAuth()

	const [email, setEmail] = useState('')
	const [isCreating, setIsCreating] = useState(false)

	const { data: invitations, isLoading, refetch } = useTrainerInvitations(profile?.id || '')
	const createMutation = useCreateInvitation()
	const cancelMutation = useCancelInvitation()
	const resendMutation = useResendInvitation()

	// Walidacja email
	const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

	// ============================================
	// HANDLERS
	// ============================================

	const handleSendInvitation = async () => {
		if (!profile?.id || !isValidEmail) return

		setIsCreating(true)

		try {
			const invitation = await createMutation.mutateAsync({
				trainerId: profile.id,
				input: { client_email: email },
			})

			setEmail('')
			Alert.alert(
				'Zaproszenie wysłane! 🎉',
				`Kod zaproszenia: ${invitation.invitation_code}\n\nPrześlij ten kod klientowi. Klient wpisze go przy rejestracji.`,
				[
					{ text: 'OK' },
					{
						text: 'Skopiuj kod',
						onPress: () => Clipboard.setStringAsync(invitation.invitation_code),
					},
				]
			)
		} catch (error: any) {
			Alert.alert('Błąd', error?.message || 'Nie udało się wysłać zaproszenia')
		} finally {
			setIsCreating(false)
		}
	}

	const handleCopyCode = async (code: string) => {
		await Clipboard.setStringAsync(code)
		Alert.alert('Skopiowano!', `Kod ${code} został skopiowany do schowka`)
	}

	const handleShareInvitation = async (invitation: Invitation) => {
		try {
			await Share.share({
				message: `Zapraszam Cię do aplikacji FitCoach!\n\nTwój kod zaproszenia: ${invitation.invitation_code}\n\nPobierz aplikację i wpisz kod przy rejestracji.`,
				title: 'Zaproszenie do FitCoach',
			})
		} catch (error) {
			console.error('Błąd udostępniania:', error)
		}
	}

	const handleCancelInvitation = (invitation: Invitation) => {
		Alert.alert(
			'Anuluj zaproszenie',
			`Czy na pewno chcesz anulować zaproszenie dla ${invitation.client_email}?`,
			[
				{ text: 'Nie', style: 'cancel' },
				{
					text: 'Tak, anuluj',
					style: 'destructive',
					onPress: () => cancelMutation.mutate(invitation.id),
				},
			]
		)
	}

	const handleResendInvitation = async (invitation: Invitation) => {
		if (!profile?.id) return

		try {
			const newInvitation = await resendMutation.mutateAsync({
				trainerId: profile.id,
				clientEmail: invitation.client_email,
			})

			Alert.alert(
				'Nowe zaproszenie!',
				`Nowy kod: ${newInvitation.invitation_code}`,
				[
					{ text: 'OK' },
					{
						text: 'Skopiuj',
						onPress: () => Clipboard.setStringAsync(newInvitation.invitation_code),
					},
				]
			)
		} catch (error: any) {
			Alert.alert('Błąd', error?.message || 'Nie udało się wysłać ponownie')
		}
	}

	// ============================================
	// RENDER
	// ============================================

	const pendingInvitations = invitations?.filter(
		(i) => i.status === 'pending' && new Date(i.expires_at) > new Date()
	)
	const otherInvitations = invitations?.filter(
		(i) => i.status !== 'pending' || new Date(i.expires_at) <= new Date()
	)

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
					<Ionicons name="close" size={28} color={colors.textPrimary} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Zaproś klienta</Text>
				<View style={{ width: 40 }} />
			</View>

			{/* Formularz zaproszenia */}
			<View style={styles.formSection}>
				<Text style={styles.sectionTitle}>Wyślij zaproszenie</Text>
				<Text style={styles.sectionDescription}>
					Wpisz adres email klienta. Otrzyma on kod, który wpisze przy rejestracji.
				</Text>

				<View style={styles.inputRow}>
					<TextInput
						style={styles.emailInput}
						placeholder="email@klienta.pl"
						placeholderTextColor={colors.textSecondary}
						value={email}
						onChangeText={setEmail}
						keyboardType="email-address"
						autoCapitalize="none"
						autoCorrect={false}
					/>
					<TouchableOpacity
						style={[
							styles.sendButton,
							(!isValidEmail || isCreating) && styles.sendButtonDisabled,
						]}
						onPress={handleSendInvitation}
						disabled={!isValidEmail || isCreating}>
						{isCreating ? (
							<ActivityIndicator size="small" color={colors.textOnPrimary} />
						) : (
							<Ionicons name="send" size={20} color={colors.textOnPrimary} />
						)}
					</TouchableOpacity>
				</View>
			</View>

			{/* Lista zaproszeń */}
			{isLoading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			) : (
				<FlatList
					data={[...(pendingInvitations || []), ...(otherInvitations || [])]}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => (
						<InvitationCard
							invitation={item}
							onCopy={() => handleCopyCode(item.invitation_code)}
							onShare={() => handleShareInvitation(item)}
							onCancel={() => handleCancelInvitation(item)}
							onResend={() => handleResendInvitation(item)}
						/>
					)}
					contentContainerStyle={styles.listContent}
					ListHeaderComponent={
						invitations && invitations.length > 0 ? (
							<Text style={styles.listHeader}>
								Wysłane zaproszenia ({invitations.length})
							</Text>
						) : null
					}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<Ionicons name="mail-outline" size={48} color={colors.textSecondary} />
							<Text style={styles.emptyText}>Brak wysłanych zaproszeń</Text>
						</View>
					}
				/>
			)}
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
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	closeButton: {
		padding: 4,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	formSection: {
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
		marginBottom: 8,
	},
	sectionDescription: {
		fontSize: 14,
		color: colors.textSecondary,
		marginBottom: 16,
		lineHeight: 20,
	},
	inputRow: {
		flexDirection: 'row',
		gap: 12,
	},
	emailInput: {
		flex: 1,
		backgroundColor: colors.surface,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		fontSize: 16,
		color: colors.textPrimary,
	},
	sendButton: {
		width: 52,
		height: 52,
		borderRadius: 12,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
	},
	sendButtonDisabled: {
		opacity: 0.5,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	listContent: {
		padding: 16,
		paddingBottom: 40,
	},
	listHeader: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.textSecondary,
		marginBottom: 12,
	},
	invitationCard: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
	},
	invitationHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	invitationEmail: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
		flex: 1,
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 6,
		gap: 4,
	},
	statusText: {
		fontSize: 12,
		fontWeight: '500',
	},
	codeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.background,
		padding: 12,
		borderRadius: 8,
		marginBottom: 12,
	},
	codeLabel: {
		color: colors.textSecondary,
		fontSize: 13,
	},
	codeValue: {
		fontSize: 20,
		fontWeight: 'bold',
		color: colors.primary,
		marginLeft: 8,
		letterSpacing: 2,
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 8,
	},
	actionButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: colors.background,
		gap: 4,
	},
	actionText: {
		fontSize: 13,
		color: colors.primary,
		fontWeight: '500',
	},
	expiresText: {
		fontSize: 12,
		color: colors.textTertiary,
		textAlign: 'center',
	},
	resendButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		gap: 6,
	},
	resendText: {
		color: colors.primary,
		fontSize: 14,
		fontWeight: '500',
	},
	acceptedText: {
		fontSize: 12,
		color: colors.success,
		textAlign: 'center',
	},
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		color: colors.textSecondary,
		marginTop: 12,
	},
})
