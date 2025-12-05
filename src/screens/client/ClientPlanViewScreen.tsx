/**
 * ClientPlanViewScreen - Widok planu treningowego dla klienta
 *
 * Pokazuje pełny tygodniowy plan z wszystkimi dniami i ćwiczeniami.
 */

import React, { useState, useMemo, useCallback } from 'react'
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	RefreshControl,
	Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useQuery } from '@tanstack/react-query'
import {
	usePlanDetails,
	DAY_NAMES,
	getCompletedWorkouts,
	type WorkoutDayWithExercises,
	type WorkoutExerciseWithDetails,
} from '../../api/services/trainingPlans'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'

type ClientPlanViewRouteProp = RouteProp<AppStackParamList, 'ClientPlanView'>

// ============================================
// MODAL SZCZEGÓŁÓW ĆWICZENIA
// ============================================

interface ExerciseDetailModalProps {
	visible: boolean
	exercise: WorkoutExerciseWithDetails | null
	onClose: () => void
}

function ExerciseDetailModal({ visible, exercise, onClose }: ExerciseDetailModalProps) {
	if (!exercise) return null

	const ex = exercise.exercise

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<SafeAreaView style={styles.modalContainer}>
				<View style={styles.modalHeader}>
					<TouchableOpacity onPress={onClose}>
						<Ionicons name="close" size={28} color={colors.textPrimary} />
					</TouchableOpacity>
					<Text style={styles.modalTitle}>Szczegóły ćwiczenia</Text>
					<View style={{ width: 28 }} />
				</View>

				<ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
					{/* Nazwa i kategoria */}
					<Text style={styles.exerciseTitle}>{ex?.name}</Text>
					<View style={styles.exerciseMeta}>
						<View style={styles.metaBadge}>
							<Text style={styles.metaBadgeText}>{ex?.category}</Text>
						</View>
						<View style={styles.metaBadge}>
							<Text style={styles.metaBadgeText}>{ex?.difficulty}</Text>
						</View>
					</View>

					{/* Parametry w planie */}
					<View style={styles.paramsSection}>
						<Text style={styles.sectionLabel}>Twoje parametry</Text>
						<View style={styles.paramsGrid}>
							<View style={styles.paramCard}>
								<Ionicons name="repeat" size={20} color={colors.primary} />
								<Text style={styles.paramValue}>{exercise.sets}</Text>
								<Text style={styles.paramLabel}>Serie</Text>
							</View>
							<View style={styles.paramCard}>
								<Ionicons name="fitness" size={20} color={colors.success} />
								<Text style={styles.paramValue}>{exercise.reps}</Text>
								<Text style={styles.paramLabel}>Powtórzenia</Text>
							</View>
							{exercise.weight_kg && (
								<View style={styles.paramCard}>
									<Ionicons name="barbell" size={20} color={colors.warning} />
									<Text style={styles.paramValue}>{exercise.weight_kg}</Text>
									<Text style={styles.paramLabel}>kg</Text>
								</View>
							)}
							<View style={styles.paramCard}>
								<Ionicons name="time" size={20} color={colors.textSecondary} />
								<Text style={styles.paramValue}>{exercise.rest_seconds}s</Text>
								<Text style={styles.paramLabel}>Odpoczynek</Text>
							</View>
						</View>
					</View>

					{/* Notatki od trenera */}
					{exercise.notes && (
						<View style={styles.notesSection}>
							<Text style={styles.sectionLabel}>Notatki od trenera</Text>
							<View style={styles.notesCard}>
								<Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
								<Text style={styles.notesText}>{exercise.notes}</Text>
							</View>
						</View>
					)}

					{/* Opis ćwiczenia */}
					{ex?.description && (
						<View style={styles.descriptionSection}>
							<Text style={styles.sectionLabel}>Opis</Text>
							<Text style={styles.descriptionText}>{ex.description}</Text>
						</View>
					)}

					{/* Wskazówki */}
					{ex?.tips && (
						<View style={styles.tipsSection}>
							<Text style={styles.sectionLabel}>Wskazówki</Text>
							<View style={styles.tipsCard}>
								<Ionicons name="bulb" size={18} color={colors.warning} />
								<Text style={styles.tipsText}>{ex.tips}</Text>
							</View>
						</View>
					)}

					{/* Grupy mięśniowe */}
					{ex?.muscle_groups && ex.muscle_groups.length > 0 && (
						<View style={styles.muscleSection}>
							<Text style={styles.sectionLabel}>Grupy mięśniowe</Text>
							<View style={styles.muscleList}>
								{ex.muscle_groups.map((muscle: string, index: number) => (
									<View key={index} style={styles.muscleBadge}>
										<Text style={styles.muscleBadgeText}>{muscle}</Text>
									</View>
								))}
							</View>
						</View>
					)}
				</ScrollView>
			</SafeAreaView>
		</Modal>
	)
}

// ============================================
// KOMPONENT ĆWICZENIA
// ============================================

interface ExerciseItemProps {
	exercise: WorkoutExerciseWithDetails
	index: number
	onPress: () => void
}

function ExerciseItem({ exercise, index, onPress }: ExerciseItemProps) {
	return (
		<TouchableOpacity style={styles.exerciseItem} onPress={onPress} activeOpacity={0.7}>
			<View style={styles.exerciseOrder}>
				<Text style={styles.exerciseOrderText}>{index + 1}</Text>
			</View>
			<View style={styles.exerciseInfo}>
				<Text style={styles.exerciseName}>{exercise.exercise?.name}</Text>
				<View style={styles.exerciseParams}>
					<Text style={styles.exerciseParamText}>
						{exercise.sets} × {exercise.reps}
					</Text>
					{exercise.weight_kg && <Text style={styles.exerciseParamText}>• {exercise.weight_kg} kg</Text>}
					<Text style={styles.exerciseParamText}>• {exercise.rest_seconds}s odp.</Text>
				</View>
			</View>
			<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
		</TouchableOpacity>
	)
}

// ============================================
// KOMPONENT DNIA
// ============================================

interface WorkoutDayCardProps {
	day: WorkoutDayWithExercises
	isToday: boolean
	isCompleted: boolean
	onExercisePress: (exercise: WorkoutExerciseWithDetails) => void
	onStartWorkout: () => void
}

function WorkoutDayCard({ day, isToday, isCompleted, onExercisePress, onStartWorkout }: WorkoutDayCardProps) {
	const [isExpanded, setIsExpanded] = useState(isToday || isCompleted)
	const dayName = DAY_NAMES[day.day_of_week]

	// Określ styl karty
	const cardStyle = [
		styles.dayCard,
		isCompleted && styles.dayCardCompleted,
		isToday && !isCompleted && styles.dayCardToday,
	]

	return (
		<View style={cardStyle}>
			<TouchableOpacity style={styles.dayHeader} onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
				<View style={styles.dayHeaderLeft}>
					<View style={[
						styles.dayBadge, 
						day.is_rest_day && styles.restDayBadge, 
						isToday && !isCompleted && styles.todayBadge,
						isCompleted && styles.completedBadge
					]}>
						<Text style={styles.dayBadgeText}>{dayName.slice(0, 3).toUpperCase()}</Text>
					</View>
					<View>
						<Text style={styles.dayName}>
							{day.name || dayName}
							{isToday && <Text style={styles.todayLabel}> (DZIŚ)</Text>}
						</Text>
						{day.is_rest_day ? (
							<Text style={styles.daySubtitle}>🛌 Dzień odpoczynku</Text>
						) : (
							<Text style={styles.daySubtitle}>{day.workout_exercises?.length || 0} ćwiczeń</Text>
						)}
					</View>
				</View>
				<View style={styles.dayHeaderRight}>
					{isCompleted && !day.is_rest_day && (
						<View style={styles.completedBadgeSmall}>
							<Ionicons name="checkmark" size={12} color={colors.success} />
							<Text style={styles.completedBadgeText}>UKOŃCZONY</Text>
						</View>
					)}
					<Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
				</View>
			</TouchableOpacity>

			{isExpanded && !day.is_rest_day && day.workout_exercises && (
				<View style={styles.dayContent}>
					{day.workout_exercises.length === 0 ? (
						<Text style={styles.noExercises}>Brak ćwiczeń</Text>
					) : (
						<>
							{day.workout_exercises.map((exercise, index) => (
								<ExerciseItem
									key={exercise.id}
									exercise={exercise}
									index={index}
									onPress={() => onExercisePress(exercise)}
								/>
							))}
							{isCompleted ? (
								<View style={styles.completedButton}>
									<Ionicons name="checkmark-circle" size={18} color={colors.success} />
									<Text style={styles.completedButtonText}>Trening ukończony</Text>
								</View>
							) : isToday ? (
								<TouchableOpacity style={styles.startWorkoutButton} onPress={onStartWorkout}>
									<Ionicons name="play" size={18} color={colors.textOnPrimary} />
									<Text style={styles.startWorkoutButtonText}>Rozpocznij trening</Text>
								</TouchableOpacity>
							) : null}
						</>
					)}
				</View>
			)}

			{isExpanded && day.is_rest_day && (
				<View style={styles.restDayContent}>
					<Ionicons name="bed" size={32} color={colors.success} />
					<Text style={styles.restDayTitle}>Czas na regenerację!</Text>
					<Text style={styles.restDayText}>Odpoczywaj i przygotuj się na kolejny trening.</Text>
				</View>
			)}
		</View>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function ClientPlanViewScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const route = useRoute<ClientPlanViewRouteProp>()
	const { planId } = route.params
	const { currentUser } = useAuth()

	const { data: plan, isLoading, refetch, isRefetching } = usePlanDetails(planId)

	// Pobierz ukończone treningi użytkownika (używamy currentUser.id bo tak zapisujemy w completed_workouts)
	const { data: completedWorkouts = [] } = useQuery({
		queryKey: ['completed-workouts', currentUser?.id],
		queryFn: () => getCompletedWorkouts(currentUser!.id),
		enabled: !!currentUser?.id,
	})

	// Zbiór ID ukończonych dni treningowych
	const completedDayIds = useMemo(() => {
		return new Set(completedWorkouts.map(w => w.workout_day_id))
	}, [completedWorkouts])

	const [selectedExercise, setSelectedExercise] = useState<WorkoutExerciseWithDetails | null>(null)
	const [showExerciseModal, setShowExerciseModal] = useState(false)

	// Oblicz dzisiejszy dzień tygodnia
	const todayDayOfWeek = useMemo(() => {
		return (new Date().getDay() + 6) % 7 // 0 = poniedziałek
	}, [])

	// ============================================
	// HANDLERS
	// ============================================

	const handleExercisePress = useCallback((exercise: WorkoutExerciseWithDetails) => {
		setSelectedExercise(exercise)
		setShowExerciseModal(true)
	}, [])

	const handleStartWorkout = useCallback(
		(workoutDayId: string) => {
			navigation.navigate('Workout', { workoutDayId })
		},
		[navigation]
	)

	// ============================================
	// FORMATOWANIE
	// ============================================

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString('pl-PL', {
			day: 'numeric',
			month: 'long',
		})
	}

	// ============================================
	// RENDER
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

	if (!plan) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.errorContainer}>
					<Ionicons name="alert-circle" size={64} color={colors.error} />
					<Text style={styles.errorText}>Nie znaleziono planu</Text>
					<TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
						<Text style={styles.backButtonText}>Wróć</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		)
	}

	// Sortuj dni według dnia tygodnia
	const sortedDays = [...(plan.workout_days || [])].sort((a, b) => a.day_of_week - b.day_of_week)

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Twój plan</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}>
				{/* Info o planie */}
				<View style={styles.planInfoCard}>
					<View style={styles.weekBadge}>
						<Ionicons name="calendar" size={18} color={colors.primary} />
						<Text style={styles.weekText}>
							{formatDate(plan.week_start)} - {formatDate(plan.week_end)}
						</Text>
					</View>

					<View style={styles.statsRow}>
						<View style={styles.statItem}>
							<Text style={styles.statValue}>{sortedDays.filter(d => !d.is_rest_day).length}</Text>
							<Text style={styles.statLabel}>Treningi</Text>
						</View>
						<View style={styles.statDivider} />
						<View style={styles.statItem}>
							<Text style={styles.statValue}>{sortedDays.filter(d => d.is_rest_day).length}</Text>
							<Text style={styles.statLabel}>Odpoczynek</Text>
						</View>
						<View style={styles.statDivider} />
						<View style={styles.statItem}>
							<Text style={styles.statValue}>
								{sortedDays.reduce((sum, day) => sum + (day.workout_exercises?.length || 0), 0)}
							</Text>
							<Text style={styles.statLabel}>Ćwiczeń</Text>
						</View>
					</View>
				</View>

				{/* Notatki trenera */}
				{plan.trainer_notes && (
					<View style={styles.notesCard}>
						<View style={styles.notesHeader}>
							<Ionicons name="document-text" size={18} color={colors.primary} />
							<Text style={styles.notesTitle}>Wskazówki od trenera</Text>
						</View>
						<Text style={styles.notesText}>{plan.trainer_notes}</Text>
					</View>
				)}

				{/* Dni treningowe */}
				<View style={styles.daysSection}>
					<Text style={styles.sectionTitle}>Harmonogram tygodnia</Text>
					{sortedDays.length === 0 ? (
						<View style={styles.emptyDays}>
							<Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
							<Text style={styles.emptyText}>Brak zaplanowanych dni</Text>
						</View>
					) : (
						sortedDays.map(day => (
							<WorkoutDayCard
								key={day.id}
								day={day}
								isToday={day.day_of_week === todayDayOfWeek}
								isCompleted={completedDayIds.has(day.id)}
								onExercisePress={handleExercisePress}
								onStartWorkout={() => handleStartWorkout(day.id)}
							/>
						))
					)}
				</View>
			</ScrollView>

			{/* Modal szczegółów ćwiczenia */}
			<ExerciseDetailModal
				visible={showExerciseModal}
				exercise={selectedExercise}
				onClose={() => {
					setShowExerciseModal(false)
					setSelectedExercise(null)
				}}
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
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		color: colors.textSecondary,
		marginTop: 12,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	errorText: {
		color: colors.textPrimary,
		fontSize: 18,
		marginTop: 16,
	},
	backButton: {
		marginTop: 24,
		paddingHorizontal: 24,
		paddingVertical: 12,
		backgroundColor: colors.primary,
		borderRadius: 8,
	},
	backButtonText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.surface,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 40,
	},
	planInfoCard: {
		backgroundColor: colors.surface,
		margin: 16,
		padding: 16,
		borderRadius: 12,
	},
	weekBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		marginBottom: 16,
	},
	weekText: {
		fontSize: 15,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	statsRow: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center',
	},
	statItem: {
		alignItems: 'center',
	},
	statValue: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.primary,
	},
	statLabel: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 2,
	},
	statDivider: {
		width: 1,
		height: 30,
		backgroundColor: colors.background,
	},
	notesCard: {
		backgroundColor: colors.surface,
		marginHorizontal: 16,
		marginBottom: 16,
		padding: 14,
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
	daysSection: {
		paddingHorizontal: 16,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
		marginBottom: 12,
	},
	dayCard: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		marginBottom: 10,
		overflow: 'hidden',
		borderWidth: 2,
		borderColor: 'transparent',
	},
	dayCardToday: {
		borderColor: colors.primary,
	},
	dayCardCompleted: {
		borderColor: colors.success,
	},
	dayHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 14,
	},
	dayHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		flex: 1,
	},
	dayHeaderRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	dayBadge: {
		backgroundColor: colors.background,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
	},
	restDayBadge: {
		backgroundColor: colors.success + '20',
	},
	todayBadge: {
		backgroundColor: colors.primary,
	},
	completedBadge: {
		backgroundColor: colors.success,
	},
	completedBadgeSmall: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: colors.success + '20',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	completedBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: colors.success,
	},
	dayBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.textPrimary,
	},
	dayName: {
		fontSize: 15,
		fontWeight: '500',
		color: colors.textPrimary,
	},
	todayLabel: {
		color: colors.primary,
		fontWeight: '700',
	},
	daySubtitle: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 2,
	},
	dayContent: {
		padding: 14,
		paddingTop: 0,
		borderTopWidth: 1,
		borderTopColor: colors.background,
	},
	noExercises: {
		color: colors.textTertiary,
		fontStyle: 'italic',
		paddingVertical: 12,
	},
	exerciseItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.background,
	},
	exerciseOrder: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: colors.primary + '20',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	exerciseOrderText: {
		color: colors.primary,
		fontWeight: '600',
		fontSize: 12,
	},
	exerciseInfo: {
		flex: 1,
	},
	exerciseName: {
		fontSize: 14,
		fontWeight: '500',
		color: colors.textPrimary,
	},
	exerciseParams: {
		flexDirection: 'row',
		gap: 6,
		marginTop: 4,
	},
	exerciseParamText: {
		fontSize: 12,
		color: colors.textSecondary,
	},
	startWorkoutButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.primary,
		paddingVertical: 14,
		borderRadius: 10,
		marginTop: 12,
		gap: 8,
	},
	startWorkoutButtonText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
		fontSize: 15,
	},
	completedButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.success + '20',
		borderWidth: 1,
		borderColor: colors.success,
		paddingVertical: 14,
		borderRadius: 10,
		marginTop: 12,
		gap: 8,
	},
	completedButtonText: {
		color: colors.success,
		fontWeight: '600',
		fontSize: 15,
	},
	restDayContent: {
		padding: 20,
		alignItems: 'center',
	},
	restDayTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
		marginTop: 10,
	},
	restDayText: {
		fontSize: 13,
		color: colors.textSecondary,
		textAlign: 'center',
		marginTop: 4,
	},
	emptyDays: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		color: colors.textTertiary,
		marginTop: 12,
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
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.surface,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	modalScroll: {
		flex: 1,
	},
	modalContent: {
		padding: 20,
	},
	exerciseTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.textPrimary,
		textAlign: 'center',
	},
	exerciseMeta: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 10,
		marginTop: 12,
	},
	metaBadge: {
		backgroundColor: colors.surface,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	metaBadgeText: {
		fontSize: 13,
		color: colors.textSecondary,
	},
	paramsSection: {
		marginTop: 24,
	},
	sectionLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.textSecondary,
		marginBottom: 10,
	},
	paramsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	paramCard: {
		flex: 1,
		minWidth: '45%',
		backgroundColor: colors.surface,
		padding: 14,
		borderRadius: 12,
		alignItems: 'center',
	},
	paramValue: {
		fontSize: 20,
		fontWeight: 'bold',
		color: colors.textPrimary,
		marginTop: 6,
	},
	paramLabel: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 2,
	},
	notesSection: {
		marginTop: 20,
	},
	notesCard: {
		flexDirection: 'row',
		backgroundColor: colors.primary + '15',
		padding: 14,
		borderRadius: 10,
		gap: 10,
	},
	descriptionSection: {
		marginTop: 20,
	},
	descriptionText: {
		fontSize: 14,
		color: colors.textSecondary,
		lineHeight: 22,
	},
	tipsSection: {
		marginTop: 20,
	},
	tipsCard: {
		flexDirection: 'row',
		backgroundColor: colors.warning + '15',
		padding: 14,
		borderRadius: 10,
		gap: 10,
	},
	tipsText: {
		flex: 1,
		fontSize: 14,
		color: colors.textSecondary,
		lineHeight: 20,
	},
	muscleSection: {
		marginTop: 20,
	},
	muscleList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	muscleBadge: {
		backgroundColor: colors.surface,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	muscleBadgeText: {
		fontSize: 13,
		color: colors.textSecondary,
	},
})
