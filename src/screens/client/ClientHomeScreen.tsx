/**
 * ClientHomeScreen - Główny ekran klienta
 *
 * Wyświetla dzisiejszy trening i postępy.
 */

import React, { useMemo, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../context/AuthContext'
import { DAY_NAMES, type WorkoutDayWithExercises } from '../../api/services/trainingPlans'
import { 
	useOfflineActivePlan, 
	useOfflineTodayWorkoutStatus, 
	useOfflineWorkoutStats,
	useNetworkStatus,
} from '../../services/offline'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'
import MessageBadge from '../../components/common/MessageBadge'
import { OfflineIndicator } from '../../components/common/OfflineBanner'

// ============================================
// KOMPONENT KARTY ĆWICZENIA
// ============================================

interface ExercisePreviewProps {
	name: string
	sets: number
	reps: string
	index: number
}

function ExercisePreview({ name, sets, reps, index }: ExercisePreviewProps) {
	return (
		<View style={styles.exercisePreview}>
			<View style={styles.exerciseNumber}>
				<Text style={styles.exerciseNumberText}>{index + 1}</Text>
			</View>
			<View style={styles.exercisePreviewInfo}>
				<Text style={styles.exercisePreviewName} numberOfLines={1}>
					{name}
				</Text>
				<Text style={styles.exercisePreviewParams}>
					{sets} x {reps}
				</Text>
			</View>
		</View>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function ClientHomeScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const { profile, clientData, currentUser } = useAuth()
	const { isOffline } = useNetworkStatus()

	// Pobierz aktywny plan (z obsługą offline)
	const { data: activePlan, isLoading, refetch, isRefetching, isFromCache } = useOfflineActivePlan(profile?.id || '')
	
	// Pobierz statystyki treningów (z obsługą offline)
	const { data: stats } = useOfflineWorkoutStats(currentUser?.id || '')

	// Oblicz dzisiejszy dzień
	const today = useMemo(() => {
		const now = new Date()
		const dayOfWeek = (now.getDay() + 6) % 7 // 0 = poniedziałek
		return {
			dayOfWeek,
			dayName: DAY_NAMES[dayOfWeek],
			date: now.toLocaleDateString('pl-PL', {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
			}),
		}
	}, [])

	// Znajdź dzisiejszy trening
	const todayWorkout = useMemo<WorkoutDayWithExercises | null>(() => {
		if (!activePlan?.workout_days) return null
		return activePlan.workout_days.find(day => day.day_of_week === today.dayOfWeek) || null
	}, [activePlan, today.dayOfWeek])

	// Sprawdź czy dzisiejszy trening jest ukończony (z obsługą offline)
	const { data: isTodayCompleted, refetch: refetchTodayStatus } = useOfflineTodayWorkoutStatus(
		currentUser?.id || '', 
		todayWorkout?.id || null
	)

	// Funkcja odświeżania wszystkiego
	const handleRefresh = useCallback(() => {
		refetch()
		refetchTodayStatus()
	}, [refetch, refetchTodayStatus])

	// ============================================
	// HANDLERS
	// ============================================

	const handleStartWorkout = () => {
		if (todayWorkout) {
			navigation.navigate('Workout', { workoutDayId: todayWorkout.id })
		}
	}

	const handleViewPlan = () => {
		if (activePlan) {
			navigation.navigate('ClientPlanView', { planId: activePlan.id })
		}
	}

	const handleContactTrainer = () => {
		if (profile?.trainer_id) {
			// Znajdź user_id trenera - na razie używamy trainer_id (profile.id)
			// W przyszłości trzeba pobrać user_id trenera
			navigation.navigate('Chat', { recipientId: profile.trainer_id })
		}
	}

	// ============================================
	// RENDER - LOADING
	// ============================================

	if (isLoading) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={styles.loadingText}>Ładowanie planu...</Text>
				</View>
			</SafeAreaView>
		)
	}

	// ============================================
	// RENDER
	// ============================================

	const greeting = useMemo(() => {
		const hour = new Date().getHours()
		if (hour < 12) return 'Dzień dobry'
		if (hour < 18) return 'Cześć'
		return 'Dobry wieczór'
	}, [])

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />}>
				{/* Header */}
				<View style={styles.header}>
					<View>
						<Text style={styles.greeting}>
							{greeting}, {profile?.first_name}! 👋
						</Text>
						<Text style={styles.date}>{today.date}</Text>
					</View>
					<View style={styles.headerRight}>
						<OfflineIndicator />
						<View style={styles.notificationButton}>
							<MessageBadge recipientId={profile?.trainer_id} />
						</View>
					</View>
				</View>

				{/* Brak planu */}
				{!activePlan && (
					<View style={styles.noPlanCard}>
						<Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
						<Text style={styles.noPlanTitle}>Brak aktywnego planu</Text>
						<Text style={styles.noPlanText}>
							Twój trener jeszcze nie przypisał Ci planu treningowego na ten tydzień.
						</Text>
						{profile?.trainer_id && (
							<TouchableOpacity style={styles.contactButton} onPress={handleContactTrainer}>
								<Ionicons name="chatbubble" size={18} color={colors.textOnPrimary} />
								<Text style={styles.contactButtonText}>Napisz do trenera</Text>
							</TouchableOpacity>
						)}
					</View>
				)}

				{/* Dzisiejszy trening */}
				{activePlan && (
					<>
						{/* Plan info */}
						<TouchableOpacity style={styles.planInfoCard} onPress={handleViewPlan}>
							<View style={styles.planInfoLeft}>
								<Ionicons name="calendar" size={20} color={colors.primary} />
								<Text style={styles.planInfoText}>
									Plan:{' '}
									{new Date(activePlan.week_start).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} -{' '}
									{new Date(activePlan.week_end).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
						</TouchableOpacity>

						{/* Dzień odpoczynku */}
						{todayWorkout?.is_rest_day && (
							<View style={styles.restDayCard}>
								<Ionicons name="bed" size={48} color={colors.success} />
								<Text style={styles.restDayTitle}>Dzień odpoczynku 😴</Text>
								<Text style={styles.restDayText}>Dziś regeneracja! Odpoczywaj i przygotuj się na kolejny trening.</Text>
							</View>
						)}

						{/* Brak treningu na dziś */}
						{!todayWorkout && (
							<View style={styles.noPlanCard}>
								<Ionicons name="sunny" size={48} color={colors.warning} />
								<Text style={styles.noPlanTitle}>Brak treningu na dziś</Text>
								<Text style={styles.noPlanText}>Na dziś ({today.dayName}) nie masz zaplanowanego treningu.</Text>
							</View>
						)}

						{/* Trening do wykonania */}
						{todayWorkout && !todayWorkout.is_rest_day && (
							<View style={[styles.workoutCard, isTodayCompleted && styles.workoutCardCompleted]}>
								<View style={styles.workoutHeader}>
									<View>
										<Text style={styles.workoutTitle}>{todayWorkout.name || `Trening - ${today.dayName}`}</Text>
										<Text style={styles.workoutSubtitle}>{todayWorkout.workout_exercises?.length || 0} ćwiczeń</Text>
									</View>
									<View style={[styles.workoutBadge, isTodayCompleted && styles.workoutBadgeCompleted]}>
										<Text style={[styles.workoutBadgeText, isTodayCompleted && styles.workoutBadgeTextCompleted]}>
											{isTodayCompleted ? '✓ UKOŃCZONY' : 'DO WYKONANIA'}
										</Text>
									</View>
								</View>

								{/* Lista ćwiczeń (preview) */}
								<View style={styles.exercisesList}>
									{todayWorkout.workout_exercises?.slice(0, 4).map((ex, index) => (
										<ExercisePreview
											key={ex.id}
											name={ex.exercise?.name || 'Ćwiczenie'}
											sets={ex.sets}
											reps={ex.reps}
											index={index}
										/>
									))}
									{(todayWorkout.workout_exercises?.length || 0) > 4 && (
										<Text style={styles.moreExercises}>
											+ {(todayWorkout.workout_exercises?.length || 0) - 4} więcej ćwiczeń
										</Text>
									)}
								</View>

								{/* Przycisk start / powtórz */}
								<TouchableOpacity 
									style={[styles.startButton, isTodayCompleted && styles.startButtonCompleted]} 
									onPress={handleStartWorkout}>
									<Ionicons 
										name={isTodayCompleted ? "refresh" : "play"} 
										size={24} 
										color={isTodayCompleted ? colors.textPrimary : colors.textOnPrimary} 
									/>
									<Text style={[styles.startButtonText, isTodayCompleted && styles.startButtonTextCompleted]}>
										{isTodayCompleted ? 'Powtórz trening' : 'Rozpocznij trening'}
									</Text>
								</TouchableOpacity>
							</View>
						)}

						{/* Notatki trenera */}
						{activePlan.trainer_notes && (
							<View style={styles.notesCard}>
								<View style={styles.notesHeader}>
									<Ionicons name="document-text" size={20} color={colors.primary} />
									<Text style={styles.notesTitle}>Notatki od trenera</Text>
								</View>
								<Text style={styles.notesText}>{activePlan.trainer_notes}</Text>
							</View>
						)}
					</>
				)}

				{/* Quick stats */}
				<View style={styles.statsSection}>
					<Text style={styles.sectionTitle}>Twoje postępy</Text>
					<View style={styles.statsRow}>
						<View style={styles.statCard}>
							<Ionicons name="fitness" size={24} color={colors.success} />
							<Text style={styles.statValue}>{stats?.thisWeek ?? 0}</Text>
							<Text style={styles.statLabel}>Ten tydzień</Text>
						</View>
						<View style={styles.statCard}>
							<Ionicons name="flame" size={24} color={colors.warning} />
							<Text style={styles.statValue}>{stats?.streak ?? 0}</Text>
							<Text style={styles.statLabel}>Dni streak</Text>
						</View>
						<View style={styles.statCard}>
							<Ionicons name="trophy" size={24} color={colors.primary} />
							<Text style={styles.statValue}>{stats?.total ?? 0}</Text>
							<Text style={styles.statLabel}>Łącznie</Text>
						</View>
					</View>
				</View>
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
	loadingText: {
		color: colors.textSecondary,
		marginTop: 12,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 100,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		padding: 20,
	},
	greeting: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.textPrimary,
	},
	date: {
		fontSize: 14,
		color: colors.textSecondary,
		marginTop: 4,
		textTransform: 'capitalize',
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	notificationButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: colors.surface,
		justifyContent: 'center',
		alignItems: 'center',
	},
	noPlanCard: {
		backgroundColor: colors.surface,
		margin: 16,
		padding: 24,
		borderRadius: 16,
		alignItems: 'center',
	},
	noPlanTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
		marginTop: 16,
	},
	noPlanText: {
		fontSize: 14,
		color: colors.textSecondary,
		textAlign: 'center',
		marginTop: 8,
		lineHeight: 20,
	},
	contactButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.primary,
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 10,
		marginTop: 20,
		gap: 8,
	},
	contactButtonText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
	},
	planInfoCard: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: colors.surface,
		marginHorizontal: 16,
		marginBottom: 12,
		padding: 14,
		borderRadius: 12,
	},
	planInfoLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	planInfoText: {
		fontSize: 14,
		color: colors.textPrimary,
	},
	restDayCard: {
		backgroundColor: colors.success + '15',
		margin: 16,
		padding: 24,
		borderRadius: 16,
		alignItems: 'center',
	},
	restDayTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: colors.textPrimary,
		marginTop: 12,
	},
	restDayText: {
		fontSize: 14,
		color: colors.textSecondary,
		textAlign: 'center',
		marginTop: 8,
	},
	workoutCard: {
		backgroundColor: colors.surface,
		margin: 16,
		borderRadius: 16,
		overflow: 'hidden',
	},
	workoutCardCompleted: {
		borderColor: colors.success,
		borderWidth: 2,
	},
	workoutHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: colors.background,
	},
	workoutTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	workoutSubtitle: {
		fontSize: 13,
		color: colors.textSecondary,
		marginTop: 4,
	},
	workoutBadge: {
		backgroundColor: colors.primary + '20',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 6,
	},
	workoutBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: colors.primary,
	},
	workoutBadgeCompleted: {
		backgroundColor: colors.success + '20',
	},
	workoutBadgeTextCompleted: {
		color: colors.success,
	},
	exercisesList: {
		padding: 16,
	},
	exercisePreview: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
	},
	exerciseNumber: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: colors.background,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	exerciseNumberText: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.textSecondary,
	},
	exercisePreviewInfo: {
		flex: 1,
	},
	exercisePreviewName: {
		fontSize: 14,
		color: colors.textPrimary,
	},
	exercisePreviewParams: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 2,
	},
	moreExercises: {
		fontSize: 13,
		color: colors.primary,
		marginTop: 8,
		textAlign: 'center',
	},
	startButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.primary,
		margin: 16,
		marginTop: 0,
		paddingVertical: 16,
		borderRadius: 12,
		gap: 10,
	},
	startButtonText: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.textOnPrimary,
	},
	startButtonCompleted: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.success,
	},
	startButtonTextCompleted: {
		color: colors.textPrimary,
	},
	notesCard: {
		backgroundColor: colors.surface,
		marginHorizontal: 16,
		marginBottom: 16,
		padding: 16,
		borderRadius: 12,
	},
	notesHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 8,
	},
	notesTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	notesText: {
		fontSize: 14,
		color: colors.textSecondary,
		lineHeight: 20,
		fontStyle: 'italic',
	},
	statsSection: {
		padding: 16,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
		marginBottom: 12,
	},
	statsRow: {
		flexDirection: 'row',
		gap: 12,
	},
	statCard: {
		flex: 1,
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
	},
	statValue: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.textPrimary,
		marginTop: 8,
	},
	statLabel: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 4,
	},
})
