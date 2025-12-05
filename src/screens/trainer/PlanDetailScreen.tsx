/**
 * PlanDetailScreen - Szczegóły planu treningowego
 *
 * Wyświetla pełny widok planu z dniami i ćwiczeniami.
 * Pozwala trenerowi edytować, duplikować lub usunąć plan.
 */

import React, { useState, useCallback } from 'react'
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ActivityIndicator,
	RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
	usePlanDetails,
	useDeletePlan,
	useDuplicatePlan,
	DAY_NAMES,
	type WorkoutDayWithExercises,
	type WorkoutExerciseWithDetails,
} from '../../api/services/trainingPlans'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'

type PlanDetailRouteProp = RouteProp<AppStackParamList, 'PlanDetail'>

// ============================================
// KOMPONENT ĆWICZENIA
// ============================================

interface ExerciseItemProps {
	exercise: WorkoutExerciseWithDetails
	index: number
}

function ExerciseItem({ exercise, index }: ExerciseItemProps) {
	return (
		<View style={styles.exerciseItem}>
			<View style={styles.exerciseOrder}>
				<Text style={styles.exerciseOrderText}>{index + 1}</Text>
			</View>
			<View style={styles.exerciseInfo}>
				<Text style={styles.exerciseName}>{exercise.exercise?.name || 'Ćwiczenie'}</Text>
				<View style={styles.exerciseParams}>
					<View style={styles.paramBadge}>
						<Text style={styles.paramText}>{exercise.sets} serii</Text>
					</View>
					<View style={styles.paramBadge}>
						<Text style={styles.paramText}>{exercise.reps} powt.</Text>
					</View>
					{exercise.weight_kg && (
						<View style={styles.paramBadge}>
							<Text style={styles.paramText}>{exercise.weight_kg} kg</Text>
						</View>
					)}
					<View style={styles.paramBadge}>
						<Ionicons name="time-outline" size={12} color={colors.textSecondary} />
						<Text style={styles.paramText}>{exercise.rest_seconds}s</Text>
					</View>
				</View>
				{exercise.notes && <Text style={styles.exerciseNotes}>{exercise.notes}</Text>}
			</View>
		</View>
	)
}

// ============================================
// KOMPONENT DNIA
// ============================================

interface WorkoutDayCardProps {
	day: WorkoutDayWithExercises
}

function WorkoutDayCard({ day }: WorkoutDayCardProps) {
	const [isExpanded, setIsExpanded] = useState(true)
	const dayName = DAY_NAMES[day.day_of_week]

	return (
		<View style={styles.dayCard}>
			<TouchableOpacity style={styles.dayHeader} onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
				<View style={styles.dayHeaderLeft}>
					<View style={[styles.dayBadge, day.is_rest_day && styles.restDayBadge]}>
						<Text style={styles.dayBadgeText}>{dayName.slice(0, 3)}</Text>
					</View>
					<View>
						<Text style={styles.dayName}>{day.name || dayName}</Text>
						{day.is_rest_day ? (
							<Text style={styles.daySubtitle}>Dzień odpoczynku</Text>
						) : (
							<Text style={styles.daySubtitle}>{day.workout_exercises?.length || 0} ćwiczeń</Text>
						)}
					</View>
				</View>
				<Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
			</TouchableOpacity>

			{isExpanded && !day.is_rest_day && day.workout_exercises && (
				<View style={styles.dayContent}>
					{day.workout_exercises.length === 0 ? (
						<Text style={styles.noExercises}>Brak ćwiczeń</Text>
					) : (
						day.workout_exercises.map((exercise, index) => (
							<ExerciseItem key={exercise.id} exercise={exercise} index={index} />
						))
					)}
				</View>
			)}
		</View>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function PlanDetailScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const route = useRoute<PlanDetailRouteProp>()
	const { planId } = route.params

	const { data: plan, isLoading, refetch, isRefetching } = usePlanDetails(planId)
	const deletePlan = useDeletePlan()
	const duplicatePlan = useDuplicatePlan()

	const [isDeleting, setIsDeleting] = useState(false)
	const [isDuplicating, setIsDuplicating] = useState(false)

	// ============================================
	// HANDLERS
	// ============================================

	const handleEdit = useCallback(() => {
		navigation.navigate('EditPlan', { planId })
	}, [navigation, planId])

	const handleDelete = useCallback(() => {
		Alert.alert('Usuń plan', 'Czy na pewno chcesz usunąć ten plan treningowy? Ta operacja jest nieodwracalna.', [
			{ text: 'Anuluj', style: 'cancel' },
			{
				text: 'Usuń',
				style: 'destructive',
				onPress: async () => {
					setIsDeleting(true)
					try {
						await deletePlan.mutateAsync(planId)
						Alert.alert('Sukces', 'Plan został usunięty', [{ text: 'OK', onPress: () => navigation.goBack() }])
					} catch (error: any) {
						Alert.alert('Błąd', error.message || 'Nie udało się usunąć planu')
					} finally {
						setIsDeleting(false)
					}
				},
			},
		])
	}, [planId, deletePlan, navigation])

	const handleDuplicate = useCallback(() => {
		Alert.alert('Duplikuj plan', 'Czy chcesz skopiować ten plan na następny tydzień?', [
			{ text: 'Anuluj', style: 'cancel' },
			{
				text: 'Duplikuj',
				onPress: async () => {
					setIsDuplicating(true)
					try {
						const newPlan = await duplicatePlan.mutateAsync(planId)
						Alert.alert('Sukces', `Plan został skopiowany na tydzień ${newPlan.week_start} - ${newPlan.week_end}`, [
							{ text: 'OK' },
						])
					} catch (error: any) {
						Alert.alert('Błąd', error.message || 'Nie udało się zduplikować planu')
					} finally {
						setIsDuplicating(false)
					}
				},
			},
		])
	}, [planId, duplicatePlan])

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

	// ============================================
	// RENDER
	// ============================================

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Plan treningowy</Text>
				<TouchableOpacity onPress={handleDelete} disabled={isDeleting}>
					{isDeleting ? (
						<ActivityIndicator size="small" color={colors.error} />
					) : (
						<Ionicons name="trash-outline" size={24} color={colors.error} />
					)}
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}>
				{/* Info o planie */}
				<View style={styles.planInfo}>
					<View style={styles.weekInfo}>
						<Ionicons name="calendar" size={20} color={colors.primary} />
						<Text style={styles.weekText}>
							{formatDate(plan.week_start)} - {formatDate(plan.week_end)}
						</Text>
					</View>

					{plan.profiles && (
						<View style={styles.clientInfo}>
							<Ionicons name="person" size={16} color={colors.textSecondary} />
							<Text style={styles.clientText}>
								{plan.profiles.first_name} {plan.profiles.last_name}
							</Text>
						</View>
					)}

					{plan.trainer_notes && (
						<View style={styles.notesSection}>
							<Text style={styles.notesLabel}>Notatki:</Text>
							<Text style={styles.notesText}>{plan.trainer_notes}</Text>
						</View>
					)}
				</View>

				{/* Status */}
				<View style={styles.statusRow}>
					<View style={[styles.statusBadge, plan.is_active ? styles.statusActive : styles.statusInactive]}>
						<Text style={styles.statusText}>{plan.is_active ? 'Aktywny' : 'Nieaktywny'}</Text>
					</View>
					<Text style={styles.exerciseCount}>
						{plan.workout_days?.reduce((sum, day) => sum + (day.workout_exercises?.length || 0), 0) || 0} ćwiczeń
						łącznie
					</Text>
				</View>

				{/* Dni treningowe */}
				<View style={styles.daysSection}>
					<Text style={styles.sectionTitle}>Dni treningowe</Text>
					{plan.workout_days && plan.workout_days.length > 0 ? (
						plan.workout_days.map(day => <WorkoutDayCard key={day.id} day={day} />)
					) : (
						<View style={styles.emptyDays}>
							<Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
							<Text style={styles.emptyText}>Brak dni treningowych</Text>
						</View>
					)}
				</View>
			</ScrollView>

			{/* Bottom Actions */}
			<View style={styles.bottomActions}>
				<View style={styles.actionsRow}>
					<TouchableOpacity style={styles.editButton} onPress={handleEdit}>
						<Ionicons name="create-outline" size={20} color={colors.textPrimary} />
						<Text style={styles.editButtonText}>Edytuj</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.duplicateButton} onPress={handleDuplicate} disabled={isDuplicating}>
						{isDuplicating ? (
							<ActivityIndicator size="small" color={colors.primary} />
						) : (
							<>
								<Ionicons name="copy-outline" size={20} color={colors.primary} />
								<Text style={styles.duplicateButtonText}>Duplikuj</Text>
							</>
						)}
					</TouchableOpacity>
				</View>
			</View>
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
		paddingBottom: 100,
	},
	planInfo: {
		padding: 16,
		backgroundColor: colors.surface,
		margin: 16,
		borderRadius: 12,
	},
	weekInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	weekText: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	clientInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 8,
	},
	clientText: {
		fontSize: 14,
		color: colors.textSecondary,
	},
	notesSection: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: colors.background,
	},
	notesLabel: {
		fontSize: 12,
		color: colors.textTertiary,
		marginBottom: 4,
	},
	notesText: {
		fontSize: 14,
		color: colors.textSecondary,
		fontStyle: 'italic',
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		marginBottom: 16,
	},
	statusBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	statusActive: {
		backgroundColor: colors.success + '20',
	},
	statusInactive: {
		backgroundColor: colors.textTertiary + '20',
	},
	statusText: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.success,
	},
	exerciseCount: {
		fontSize: 13,
		color: colors.textSecondary,
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
		marginBottom: 12,
		overflow: 'hidden',
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
	},
	dayBadge: {
		backgroundColor: colors.primary,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
	},
	restDayBadge: {
		backgroundColor: colors.textTertiary,
	},
	dayBadgeText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
		fontSize: 12,
	},
	dayName: {
		fontSize: 15,
		fontWeight: '500',
		color: colors.textPrimary,
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
		alignItems: 'flex-start',
		paddingVertical: 10,
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
		fontSize: 13,
	},
	exerciseInfo: {
		flex: 1,
	},
	exerciseName: {
		fontSize: 14,
		fontWeight: '500',
		color: colors.textPrimary,
		marginBottom: 6,
	},
	exerciseParams: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	paramBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.background,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
		gap: 4,
	},
	paramText: {
		fontSize: 12,
		color: colors.textSecondary,
	},
	exerciseNotes: {
		fontSize: 12,
		color: colors.textTertiary,
		fontStyle: 'italic',
		marginTop: 6,
	},
	emptyDays: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		color: colors.textTertiary,
		marginTop: 12,
	},
	bottomActions: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: colors.background,
		borderTopWidth: 1,
		borderTopColor: colors.surface,
		padding: 16,
		paddingBottom: 32,
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 12,
	},
	editButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.surface,
		paddingVertical: 14,
		borderRadius: 12,
		gap: 8,
	},
	editButtonText: {
		color: colors.textPrimary,
		fontWeight: '600',
		fontSize: 15,
	},
	duplicateButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.primary + '15',
		paddingVertical: 14,
		borderRadius: 12,
		gap: 8,
	},
	duplicateButtonText: {
		color: colors.primary,
		fontWeight: '600',
		fontSize: 15,
	},
})
