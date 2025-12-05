/**
 * ClientDetailScreen - Szczegóły klienta
 *
 * Wyświetla pełne informacje o kliencie: dane, pomiary, plany, statystyki.
 */

import React from 'react'
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useClientDetails, useUnassignClient } from '../../api/services/clients'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'

// ============================================
// TYPY
// ============================================

type ClientDetailRouteProp = RouteProp<AppStackParamList, 'ClientDetail'>

// ============================================
// KOMPONENTY SEKCJI
// ============================================

interface StatCardProps {
	icon: string
	value: number | string
	label: string
	color?: string
}

function StatCard({ icon, value, label, color = colors.primary }: StatCardProps) {
	return (
		<View style={styles.statCard}>
			<Ionicons name={icon as any} size={24} color={color} />
			<Text style={[styles.statValue, { color }]}>{value}</Text>
			<Text style={styles.statLabel}>{label}</Text>
		</View>
	)
}

interface MeasurementRowProps {
	label: string
	value: string | number | null
	unit: string
}

function MeasurementRow({ label, value, unit }: MeasurementRowProps) {
	if (value === null || value === undefined) return null
	return (
		<View style={styles.measurementRow}>
			<Text style={styles.measurementLabel}>{label}</Text>
			<Text style={styles.measurementValue}>
				{value} {unit}
			</Text>
		</View>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function ClientDetailScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const route = useRoute<ClientDetailRouteProp>()
	const { clientId } = route.params

	const { data: client, isLoading, refetch } = useClientDetails(clientId)
	const unassignMutation = useUnassignClient()

	// ============================================
	// HANDLERS
	// ============================================

	const handleCreatePlan = () => {
		navigation.navigate('CreatePlan', { clientId })
	}

	const handleViewPlan = () => {
		if (client?.active_plan) {
			navigation.navigate('PlanDetail', { planId: client.active_plan.id })
		}
	}

	const handleSendMessage = () => {
		if (client) {
			navigation.navigate('Chat', { recipientId: client.user_id })
		}
	}

	const handleUnassign = () => {
		Alert.alert(
			'Odłącz klienta',
			`Czy na pewno chcesz odłączyć ${client?.first_name} ${client?.last_name} od swojego konta?`,
			[
				{ text: 'Anuluj', style: 'cancel' },
				{
					text: 'Odłącz',
					style: 'destructive',
					onPress: async () => {
						try {
							await unassignMutation.mutateAsync(clientId)
							navigation.goBack()
						} catch (error: any) {
							Alert.alert('Błąd', error?.message || 'Nie udało się odłączyć klienta')
						}
					},
				},
			]
		)
	}

	// ============================================
	// RENDER - LOADING
	// ============================================

	if (isLoading) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			</SafeAreaView>
		)
	}

	// ============================================
	// RENDER - NOT FOUND
	// ============================================

	if (!client) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.header}>
					<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
						<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Szczegóły klienta</Text>
					<View style={{ width: 40 }} />
				</View>
				<View style={styles.notFoundContainer}>
					<Ionicons name="person-outline" size={64} color={colors.textSecondary} />
					<Text style={styles.notFoundText}>Klient nie został znaleziony</Text>
				</View>
			</SafeAreaView>
		)
	}

	// Dane klienta
	const clientData = client.client_data
	const latestMeasurement = client.measurements?.[0]

	// ============================================
	// RENDER
	// ============================================

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
					<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Profil klienta</Text>
				<TouchableOpacity style={styles.menuButton} onPress={handleUnassign}>
					<Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
				{/* Profil klienta */}
				<View style={styles.profileSection}>
					<View style={styles.avatarLarge}>
						<Text style={styles.avatarLargeText}>
							{client.first_name?.[0]?.toUpperCase()}
							{client.last_name?.[0]?.toUpperCase()}
						</Text>
					</View>
					<Text style={styles.clientName}>
						{client.first_name} {client.last_name}
					</Text>
					<Text style={styles.clientEmail}>{client.email}</Text>

					{/* Quick actions */}
					<View style={styles.quickActions}>
						<TouchableOpacity style={styles.quickAction} onPress={handleSendMessage}>
							<Ionicons name="chatbubble" size={20} color={colors.primary} />
							<Text style={styles.quickActionText}>Wiadomość</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.quickAction} onPress={handleCreatePlan}>
							<Ionicons name="add-circle" size={20} color={colors.success} />
							<Text style={styles.quickActionText}>Nowy plan</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Statystyki */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Statystyki</Text>
					<View style={styles.statsGrid}>
						<StatCard
							icon="fitness"
							value={client.stats.total_workouts}
							label="Treningów"
							color={colors.success}
						/>
						<StatCard
							icon="flame"
							value={client.stats.streak_days}
							label="Dni streak"
							color={colors.warning}
						/>
						<StatCard
							icon="calendar"
							value={client.stats.workouts_this_week}
							label="Ten tydzień"
							color={colors.info}
						/>
						<StatCard
							icon="trophy"
							value={client.stats.workouts_this_month}
							label="Ten miesiąc"
							color={colors.primary}
						/>
					</View>
				</View>

				{/* Aktywny plan */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Aktywny plan</Text>
					{client.active_plan ? (
						<TouchableOpacity style={styles.planCard} onPress={handleViewPlan}>
							<View style={styles.planIcon}>
								<Ionicons name="calendar" size={24} color={colors.primary} />
							</View>
							<View style={styles.planInfo}>
								<Text style={styles.planTitle}>
									Tydzień {new Date(client.active_plan.week_start).toLocaleDateString('pl-PL')}
								</Text>
								<Text style={styles.planDates}>
									{new Date(client.active_plan.week_start).toLocaleDateString('pl-PL')} -{' '}
									{new Date(client.active_plan.week_end).toLocaleDateString('pl-PL')}
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
						</TouchableOpacity>
					) : (
						<View style={styles.noPlanCard}>
							<Ionicons name="calendar-outline" size={32} color={colors.textSecondary} />
							<Text style={styles.noPlanText}>Brak aktywnego planu</Text>
							<TouchableOpacity style={styles.createPlanButton} onPress={handleCreatePlan}>
								<Text style={styles.createPlanButtonText}>Stwórz plan</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>

				{/* Dane klienta */}
				{clientData && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Dane klienta</Text>
						<View style={styles.dataCard}>
							<MeasurementRow label="Wzrost" value={clientData.height_cm} unit="cm" />
							<MeasurementRow label="Waga docelowa" value={clientData.target_weight_kg} unit="kg" />
							<MeasurementRow label="Cel" value={clientData.fitness_goal} unit="" />
							<MeasurementRow
								label="Poziom"
								value={
									clientData.experience_level === 'beginner'
										? 'Początkujący'
										: clientData.experience_level === 'intermediate'
										? 'Średniozaawansowany'
										: clientData.experience_level === 'advanced'
										? 'Zaawansowany'
										: null
								}
								unit=""
							/>
							{clientData.health_notes && (
								<View style={styles.healthNotes}>
									<Ionicons name="warning" size={16} color={colors.warning} />
									<Text style={styles.healthNotesText}>{clientData.health_notes}</Text>
								</View>
							)}
						</View>
					</View>
				)}

				{/* Ostatni pomiar */}
				{latestMeasurement && (
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Ostatni pomiar</Text>
							<Text style={styles.sectionDate}>
								{new Date(latestMeasurement.measurement_date).toLocaleDateString('pl-PL')}
							</Text>
						</View>
						<View style={styles.dataCard}>
							<MeasurementRow label="Waga" value={latestMeasurement.weight_kg} unit="kg" />
							<MeasurementRow
								label="Tkanka tłuszczowa"
								value={latestMeasurement.body_fat_percentage}
								unit="%"
							/>
							<MeasurementRow label="Obwód brzucha" value={latestMeasurement.waist_cm} unit="cm" />
							<MeasurementRow label="Obwód klatki" value={latestMeasurement.chest_cm} unit="cm" />
							<MeasurementRow label="Obwód ramienia" value={latestMeasurement.arm_cm} unit="cm" />
							<MeasurementRow label="Obwód uda" value={latestMeasurement.thigh_cm} unit="cm" />
						</View>
					</View>
				)}

				{/* Ostatnie treningi */}
				{client.recent_workouts && client.recent_workouts.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Ostatnie treningi</Text>
						{client.recent_workouts.slice(0, 5).map((workout) => (
							<View key={workout.id} style={styles.workoutRow}>
								<View style={styles.workoutIcon}>
									<Ionicons
										name={
											workout.status === 'completed'
												? 'checkmark-circle'
												: workout.status === 'partial'
												? 'ellipse'
												: 'close-circle'
										}
										size={20}
										color={
											workout.status === 'completed'
												? colors.success
												: workout.status === 'partial'
												? colors.warning
												: colors.error
										}
									/>
								</View>
								<View style={styles.workoutInfo}>
									<Text style={styles.workoutDate}>
										{new Date(workout.completed_date).toLocaleDateString('pl-PL', {
											weekday: 'long',
											day: 'numeric',
											month: 'long',
										})}
									</Text>
									{workout.duration_minutes && (
										<Text style={styles.workoutDuration}>{workout.duration_minutes} min</Text>
									)}
								</View>
								{workout.feeling_rating && (
									<View style={styles.feelingBadge}>
										<Text style={styles.feelingText}>
											{'⭐'.repeat(workout.feeling_rating)}
										</Text>
									</View>
								)}
							</View>
						))}
					</View>
				)}

				{/* Spacer */}
				<View style={{ height: 40 }} />
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
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
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
	backButton: {
		padding: 8,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	menuButton: {
		padding: 8,
	},
	notFoundContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	notFoundText: {
		color: colors.textSecondary,
		marginTop: 16,
	},
	scrollView: {
		flex: 1,
	},
	profileSection: {
		alignItems: 'center',
		paddingVertical: 24,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	avatarLarge: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: colors.primary + '25',
		justifyContent: 'center',
		alignItems: 'center',
	},
	avatarLargeText: {
		fontSize: 28,
		fontWeight: 'bold',
		color: colors.primary,
	},
	clientName: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.textPrimary,
		marginTop: 12,
	},
	clientEmail: {
		fontSize: 14,
		color: colors.textSecondary,
		marginTop: 4,
	},
	quickActions: {
		flexDirection: 'row',
		gap: 16,
		marginTop: 20,
	},
	quickAction: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
		gap: 8,
	},
	quickActionText: {
		color: colors.textPrimary,
		fontSize: 14,
		fontWeight: '500',
	},
	section: {
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
		marginBottom: 12,
	},
	sectionDate: {
		fontSize: 13,
		color: colors.textSecondary,
	},
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	statCard: {
		flex: 1,
		minWidth: '45%',
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
	},
	statValue: {
		fontSize: 28,
		fontWeight: 'bold',
		marginTop: 8,
	},
	statLabel: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 4,
	},
	planCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 16,
	},
	planIcon: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: colors.primary + '20',
		justifyContent: 'center',
		alignItems: 'center',
	},
	planInfo: {
		flex: 1,
		marginLeft: 12,
	},
	planTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	planDates: {
		fontSize: 13,
		color: colors.textSecondary,
		marginTop: 2,
	},
	noPlanCard: {
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 24,
	},
	noPlanText: {
		color: colors.textSecondary,
		marginTop: 8,
		marginBottom: 16,
	},
	createPlanButton: {
		backgroundColor: colors.primary,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
	},
	createPlanButtonText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
	},
	dataCard: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 16,
	},
	measurementRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	measurementLabel: {
		color: colors.textSecondary,
		fontSize: 14,
	},
	measurementValue: {
		color: colors.textPrimary,
		fontSize: 14,
		fontWeight: '500',
	},
	healthNotes: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginTop: 12,
		padding: 12,
		backgroundColor: colors.warning + '15',
		borderRadius: 8,
		gap: 8,
	},
	healthNotesText: {
		flex: 1,
		color: colors.textPrimary,
		fontSize: 13,
	},
	workoutRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: 10,
		padding: 12,
		marginBottom: 8,
	},
	workoutIcon: {
		marginRight: 12,
	},
	workoutInfo: {
		flex: 1,
	},
	workoutDate: {
		fontSize: 14,
		color: colors.textPrimary,
		textTransform: 'capitalize',
	},
	workoutDuration: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 2,
	},
	feelingBadge: {
		paddingHorizontal: 8,
	},
	feelingText: {
		fontSize: 12,
	},
})

