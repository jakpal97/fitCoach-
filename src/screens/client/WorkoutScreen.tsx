/**
 * WorkoutScreen - Ekran wykonywania treningu
 *
 * Klient przechodzi przez ćwiczenia i oznacza wykonane serie.
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ActivityIndicator,
	Modal,
	Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '../../api/supabase'
import { useAuth } from '../../context/AuthContext'
import { notifyWorkoutCompleted } from '../../services/notifications'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'
import type { WorkoutExercise, Exercise } from '../../types'
import VideoPlayer from '../../components/exercises/VideoPlayer'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

type WorkoutRouteProp = RouteProp<AppStackParamList, 'Workout'>

// ============================================
// TYPY
// ============================================

interface WorkoutExerciseWithDetails extends WorkoutExercise {
	exercise: Exercise
}

interface ExerciseProgress {
	exerciseId: string
	completedSets: number[]
	isCompleted: boolean
}

// ============================================
// API
// ============================================

async function getWorkoutDayDetails(workoutDayId: string) {
	const { data, error } = await supabase
		.from('workout_days')
		.select(`
			*,
			workout_exercises (
				*,
				exercise:exercises (*)
			),
			training_plans (
				*
			)
		`)
		.eq('id', workoutDayId)
		.single()

	if (error) throw handleSupabaseError(error)
	
	// Sortuj ćwiczenia po order_index
	if (data?.workout_exercises) {
		data.workout_exercises.sort((a: any, b: any) => a.order_index - b.order_index)
	}
	
	return data
}

async function saveCompletedWorkout(
	userId: string,
	workoutDayId: string,
	status: 'completed' | 'partial',
	durationMinutes: number,
	feelingRating: number,
	clientNotes?: string
) {
	const { data, error } = await supabase
		.from('completed_workouts')
		.insert({
			user_id: userId,
			workout_day_id: workoutDayId,
			status,
			duration_minutes: durationMinutes,
			feeling_rating: feelingRating,
			client_notes: clientNotes,
		})
		.select()
		.single()

	if (error) throw handleSupabaseError(error)
	return data
}

// ============================================
// MODAL SZCZEGÓŁÓW ĆWICZENIA
// ============================================

interface ExerciseDetailModalProps {
	visible: boolean
	onClose: () => void
	exercise: WorkoutExerciseWithDetails | null
}

function ExerciseDetailModal({ visible, onClose, exercise }: ExerciseDetailModalProps) {
	if (!exercise) return null

	const ex = exercise.exercise

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<SafeAreaView style={styles.detailModalContainer}>
				{/* Header */}
				<View style={styles.detailModalHeader}>
					<Text style={styles.detailModalTitle}>{ex?.name}</Text>
					<TouchableOpacity onPress={onClose} style={styles.detailCloseButton}>
						<Ionicons name="close" size={28} color={colors.textPrimary} />
					</TouchableOpacity>
				</View>

				<ScrollView style={styles.detailModalContent} showsVerticalScrollIndicator={false}>
				{/* Video - pełnoekranowe */}
				{ex?.video_url ? (
					<View style={styles.fullVideoContainer}>
						<VideoPlayer
							videoUrl={ex.video_url}
							height={SCREEN_WIDTH * 0.75}
							autoplay={false}
							showControls
						/>
					</View>
				) : (
					<View style={styles.noVideoFull}>
						<Ionicons name="videocam-off" size={48} color={colors.textTertiary} />
						<Text style={styles.noVideoText}>Brak video</Text>
					</View>
				)}

					{/* Parametry ćwiczenia */}
					<View style={styles.detailParams}>
						<View style={styles.detailParamRow}>
							<View style={styles.detailParam}>
								<Text style={styles.detailParamValue}>{exercise.sets}</Text>
								<Text style={styles.detailParamLabel}>Serii</Text>
							</View>
							<View style={styles.detailParam}>
								<Text style={styles.detailParamValue}>{exercise.reps}</Text>
								<Text style={styles.detailParamLabel}>Powtórzeń</Text>
							</View>
							{exercise.weight_kg && (
								<View style={styles.detailParam}>
									<Text style={styles.detailParamValue}>{exercise.weight_kg}</Text>
									<Text style={styles.detailParamLabel}>kg</Text>
								</View>
							)}
							<View style={styles.detailParam}>
								<Text style={styles.detailParamValue}>{exercise.rest_seconds}s</Text>
								<Text style={styles.detailParamLabel}>Odpoczynek</Text>
							</View>
						</View>
					</View>

					{/* Info o ćwiczeniu */}
					<View style={styles.detailSection}>
						<View style={styles.detailBadges}>
							<View style={styles.detailBadge}>
								<Text style={styles.detailBadgeText}>{ex?.category}</Text>
							</View>
							<View style={styles.detailBadge}>
								<Text style={styles.detailBadgeText}>{ex?.difficulty}</Text>
							</View>
							{ex?.equipment && (
								<View style={styles.detailBadge}>
									<Text style={styles.detailBadgeText}>{ex.equipment}</Text>
								</View>
							)}
						</View>
					</View>

					{/* Partie mięśniowe */}
					{ex?.muscle_groups && ex.muscle_groups.length > 0 && (
						<View style={styles.detailSection}>
							<Text style={styles.detailSectionTitle}>Partie mięśniowe</Text>
							<View style={styles.muscleGroupsRow}>
								{ex.muscle_groups.map((muscle, idx) => (
									<View key={idx} style={styles.muscleChip}>
										<Text style={styles.muscleChipText}>{muscle}</Text>
									</View>
								))}
							</View>
						</View>
					)}

					{/* Instrukcje */}
					{ex?.instructions && (
						<View style={styles.detailSection}>
							<Text style={styles.detailSectionTitle}>Instrukcje</Text>
							<Text style={styles.detailInstructions}>{ex.instructions}</Text>
						</View>
					)}

					{/* Notatki trenera */}
					{exercise.notes && (
						<View style={styles.detailSection}>
							<Text style={styles.detailSectionTitle}>💡 Wskazówki trenera</Text>
							<Text style={styles.trainerNotes}>{exercise.notes}</Text>
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

interface ExerciseCardProps {
	exercise: WorkoutExerciseWithDetails
	index: number
	progress: ExerciseProgress
	onSetComplete: (setIndex: number) => void
	onViewDetails: () => void
}

function ExerciseCard({
	exercise,
	index,
	progress,
	onSetComplete,
	onViewDetails,
}: ExerciseCardProps) {
	const [showVideo, setShowVideo] = useState(false)
	const completedSetsCount = progress.completedSets.length
	const hasVideo = !!exercise.exercise?.video_url

	return (
		<View style={[styles.exerciseCard, progress.isCompleted && styles.exerciseCardCompleted]}>
			<TouchableOpacity style={styles.exerciseHeader} onPress={onViewDetails}>
				<View style={styles.exerciseOrderBadge}>
					{progress.isCompleted ? (
						<Ionicons name="checkmark" size={16} color={colors.success} />
					) : (
						<Text style={styles.exerciseOrderText}>{index + 1}</Text>
					)}
				</View>
				<View style={styles.exerciseInfo}>
					<Text style={styles.exerciseName}>{exercise.exercise?.name}</Text>
					<Text style={styles.exerciseParams}>
						{exercise.sets} serii × {exercise.reps} powt.
						{exercise.weight_kg && ` • ${exercise.weight_kg} kg`}
					</Text>
				</View>
				<Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
			</TouchableOpacity>

			{/* Serie */}
			<View style={styles.setsContainer}>
				<Text style={styles.setsLabel}>
					Serie: {completedSetsCount}/{exercise.sets}
				</Text>
				<View style={styles.setsRow}>
					{Array.from({ length: exercise.sets }).map((_, setIndex) => {
						const isCompleted = progress.completedSets.includes(setIndex)
						return (
							<TouchableOpacity
								key={setIndex}
								style={[styles.setButton, isCompleted && styles.setButtonCompleted]}
								onPress={() => onSetComplete(setIndex)}>
								{isCompleted ? (
									<Ionicons name="checkmark" size={18} color={colors.textOnPrimary} />
								) : (
									<Text style={styles.setButtonText}>{setIndex + 1}</Text>
								)}
							</TouchableOpacity>
						)
					})}
				</View>
				{exercise.rest_seconds > 0 && (
					<Text style={styles.restTime}>
						<Ionicons name="time-outline" size={12} color={colors.textTertiary} /> Odpoczynek: {exercise.rest_seconds}s
					</Text>
				)}
			</View>

			{/* Video - miniatura lub rozwinięte */}
			{hasVideo && (
				<View style={styles.videoSection}>
					<TouchableOpacity
						style={styles.videoToggle}
						onPress={() => setShowVideo(!showVideo)}>
						<Ionicons
							name={showVideo ? 'chevron-up' : 'videocam'}
							size={18}
							color={colors.primary}
						/>
						<Text style={styles.videoToggleText}>
							{showVideo ? 'Ukryj video' : 'Zobacz video'}
						</Text>
					</TouchableOpacity>

				{showVideo && (
					<TouchableOpacity onPress={onViewDetails} activeOpacity={0.9}>
						<View style={styles.videoWrapper}>
							<VideoPlayer
								videoUrl={exercise.exercise.video_url!}
								height={180}
								autoplay={false}
								showControls
							/>
							<View style={styles.videoExpandHint}>
								<Ionicons name="expand" size={16} color={colors.textOnPrimary} />
								<Text style={styles.videoExpandText}>Powiększ</Text>
							</View>
						</View>
					</TouchableOpacity>
				)}
				</View>
			)}

			{exercise.notes && (
				<Text style={styles.exerciseNotes}>💡 {exercise.notes}</Text>
			)}
		</View>
	)
}

// ============================================
// MODAL PODSUMOWANIA
// ============================================

interface SummaryModalProps {
	visible: boolean
	onClose: () => void
	onSave: (rating: number, notes: string) => void
	completedCount: number
	totalCount: number
	duration: number
	isSaving: boolean
}

function SummaryModal({
	visible,
	onClose,
	onSave,
	completedCount,
	totalCount,
	duration,
	isSaving,
}: SummaryModalProps) {
	const [rating, setRating] = useState(3)
	const [notes, setNotes] = useState('')

	const isPartial = completedCount < totalCount

	return (
		<Modal visible={visible} animationType="slide" transparent>
			<View style={styles.modalOverlay}>
				<View style={styles.modalContent}>
					<Text style={styles.modalTitle}>
						{isPartial ? 'Zakończ trening' : 'Świetna robota! 🎉'}
					</Text>

					<View style={styles.summaryStats}>
						<View style={styles.summaryStat}>
							<Ionicons name="fitness" size={24} color={colors.success} />
							<Text style={styles.summaryStatValue}>{completedCount}/{totalCount}</Text>
							<Text style={styles.summaryStatLabel}>Ćwiczeń</Text>
						</View>
						<View style={styles.summaryStat}>
							<Ionicons name="time" size={24} color={colors.primary} />
							<Text style={styles.summaryStatValue}>{duration}</Text>
							<Text style={styles.summaryStatLabel}>Minut</Text>
						</View>
					</View>

					<Text style={styles.ratingLabel}>Jak się czujesz?</Text>
					<View style={styles.ratingRow}>
						{[1, 2, 3, 4, 5].map((value) => (
							<TouchableOpacity
								key={value}
								style={[styles.ratingButton, rating === value && styles.ratingButtonActive]}
								onPress={() => setRating(value)}>
								<Text style={styles.ratingEmoji}>
									{value === 1 ? '😫' : value === 2 ? '😕' : value === 3 ? '😐' : value === 4 ? '😊' : '💪'}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					<View style={styles.modalActions}>
						<TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
							<Text style={styles.modalCancelText}>Anuluj</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.modalSaveButton}
							onPress={() => onSave(rating, notes)}
							disabled={isSaving}>
							{isSaving ? (
								<ActivityIndicator size="small" color={colors.textOnPrimary} />
							) : (
								<Text style={styles.modalSaveText}>Zapisz</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function WorkoutScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const route = useRoute<WorkoutRouteProp>()
	const { workoutDayId } = route.params
	const { currentUser } = useAuth()
	const queryClient = useQueryClient()

	const [progress, setProgress] = useState<Map<string, ExerciseProgress>>(new Map())
	const [startTime] = useState(new Date())
	const [showSummary, setShowSummary] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [selectedExercise, setSelectedExercise] = useState<WorkoutExerciseWithDetails | null>(null)
	const [showExerciseDetail, setShowExerciseDetail] = useState(false)

	// Pobierz szczegóły treningu
	const { data: workoutDay, isLoading } = useQuery({
		queryKey: ['workout-day', workoutDayId],
		queryFn: () => getWorkoutDayDetails(workoutDayId),
	})

	const exercises = (workoutDay?.workout_exercises || []) as WorkoutExerciseWithDetails[]

	// Oblicz postęp
	const { completedCount, totalCount } = useMemo(() => {
		let completed = 0
		let total = exercises.length

		exercises.forEach((ex) => {
			const exProgress = progress.get(ex.id)
			if (exProgress?.isCompleted) {
				completed++
			}
		})

		return { completedCount: completed, totalCount: total }
	}, [exercises, progress])

	const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

	// ============================================
	// HANDLERS
	// ============================================

	const handleSetComplete = useCallback((exerciseId: string, setIndex: number, totalSets: number) => {
		setProgress((prev) => {
			const newProgress = new Map(prev)
			const current = newProgress.get(exerciseId) || {
				exerciseId,
				completedSets: [],
				isCompleted: false,
			}

			let newCompletedSets: number[]
			if (current.completedSets.includes(setIndex)) {
				newCompletedSets = current.completedSets.filter((s) => s !== setIndex)
			} else {
				newCompletedSets = [...current.completedSets, setIndex]
			}

			newProgress.set(exerciseId, {
				...current,
				completedSets: newCompletedSets,
				isCompleted: newCompletedSets.length >= totalSets,
			})

			return newProgress
		})
	}, [])

	const handleViewDetails = useCallback((exercise: WorkoutExerciseWithDetails) => {
		setSelectedExercise(exercise)
		setShowExerciseDetail(true)
	}, [])

	const handleFinishWorkout = useCallback(() => {
		if (completedCount === 0) {
			Alert.alert('Uwaga', 'Wykonaj przynajmniej jedno ćwiczenie przed zakończeniem')
			return
		}
		setShowSummary(true)
	}, [completedCount])

	const handleSaveWorkout = useCallback(async (rating: number, notes: string) => {
		if (!currentUser?.id) return

		setIsSaving(true)
		try {
			const duration = Math.round((new Date().getTime() - startTime.getTime()) / 60000)
			const status = completedCount === totalCount ? 'completed' : 'partial'

			await saveCompletedWorkout(
				currentUser.id,
				workoutDayId,
				status,
				duration,
				rating,
				notes || undefined
			)

			queryClient.invalidateQueries({ queryKey: ['active-plan'] })
			queryClient.invalidateQueries({ queryKey: ['workout-stats'] })
			queryClient.invalidateQueries({ queryKey: ['today-workout-status'] })

			// Wyślij powiadomienie do trenera
			if (workoutDay?.training_plans?.trainer_id) {
				// Pobierz user_id trenera
				const { data: trainerProfile } = await supabase
					.from('profiles')
					.select('user_id, first_name')
					.eq('id', workoutDay.training_plans.trainer_id)
					.single()
				
				if (trainerProfile?.user_id) {
					const { data: clientProfile } = await supabase
						.from('profiles')
						.select('first_name, last_name')
						.eq('user_id', currentUser.id)
						.single()
					
					const clientName = clientProfile 
						? `${clientProfile.first_name} ${clientProfile.last_name}`
						: 'Klient'
					
					notifyWorkoutCompleted(trainerProfile.user_id, clientName)
				}
			}

			Alert.alert(
				'Trening zapisany! 🎉',
				`Ukończyłeś ${completedCount}/${totalCount} ćwiczeń w ${duration} minut`,
				[{ text: 'OK', onPress: () => navigation.goBack() }]
			)
		} catch (error: any) {
			Alert.alert('Błąd', error.message || 'Nie udało się zapisać treningu')
		} finally {
			setIsSaving(false)
			setShowSummary(false)
		}
	}, [currentUser?.id, workoutDayId, workoutDay, completedCount, totalCount, startTime, navigation, queryClient])

	const handleExit = useCallback(() => {
		if (completedCount > 0) {
			Alert.alert(
				'Wyjść z treningu?',
				'Twój postęp zostanie utracony',
				[
					{ text: 'Zostań', style: 'cancel' },
					{ text: 'Wyjdź', style: 'destructive', onPress: () => navigation.goBack() },
				]
			)
		} else {
			navigation.goBack()
		}
	}, [completedCount, navigation])

	// ============================================
	// RENDER
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

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={handleExit}>
					<Ionicons name="close" size={28} color={colors.textPrimary} />
				</TouchableOpacity>
				<View style={styles.headerCenter}>
					<Text style={styles.headerTitle}>{workoutDay?.name || 'Trening'}</Text>
					<Text style={styles.headerSubtitle}>{progressPercent}% ukończone</Text>
				</View>
				<TouchableOpacity
					style={styles.finishButton}
					onPress={handleFinishWorkout}>
					<Text style={styles.finishButtonText}>Zakończ</Text>
				</TouchableOpacity>
			</View>

			{/* Progress bar */}
			<View style={styles.progressBar}>
				<View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
			</View>

			{/* Exercises */}
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}>
				{exercises.map((exercise, index) => (
					<ExerciseCard
						key={exercise.id}
						exercise={exercise}
						index={index}
						progress={progress.get(exercise.id) || {
							exerciseId: exercise.id,
							completedSets: [],
							isCompleted: false,
						}}
						onSetComplete={(setIndex) =>
							handleSetComplete(exercise.id, setIndex, exercise.sets)
						}
						onViewDetails={() => handleViewDetails(exercise)}
					/>
				))}
			</ScrollView>

			{/* Summary Modal */}
			<SummaryModal
				visible={showSummary}
				onClose={() => setShowSummary(false)}
				onSave={handleSaveWorkout}
				completedCount={completedCount}
				totalCount={totalCount}
				duration={Math.round((new Date().getTime() - startTime.getTime()) / 60000)}
				isSaving={isSaving}
			/>

			{/* Exercise Detail Modal */}
			<ExerciseDetailModal
				visible={showExerciseDetail}
				onClose={() => setShowExerciseDetail(false)}
				exercise={selectedExercise}
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
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	headerCenter: {
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	headerSubtitle: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 2,
	},
	finishButton: {
		backgroundColor: colors.primary,
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
	},
	finishButtonText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
		fontSize: 14,
	},
	progressBar: {
		height: 4,
		backgroundColor: colors.surface,
	},
	progressFill: {
		height: '100%',
		backgroundColor: colors.success,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 40,
	},
	exerciseCard: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		marginBottom: 12,
		overflow: 'hidden',
	},
	exerciseCardCompleted: {
		borderColor: colors.success,
		borderWidth: 2,
	},
	exerciseHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 14,
		borderBottomWidth: 1,
		borderBottomColor: colors.background,
	},
	exerciseOrderBadge: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: colors.background,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	exerciseOrderText: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.textSecondary,
	},
	exerciseInfo: {
		flex: 1,
	},
	exerciseName: {
		fontSize: 15,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	exerciseParams: {
		fontSize: 13,
		color: colors.textSecondary,
		marginTop: 2,
	},
	setsContainer: {
		padding: 14,
	},
	setsLabel: {
		fontSize: 13,
		color: colors.textSecondary,
		marginBottom: 10,
	},
	setsRow: {
		flexDirection: 'row',
		gap: 10,
	},
	setButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: colors.background,
		justifyContent: 'center',
		alignItems: 'center',
	},
	setButtonCompleted: {
		backgroundColor: colors.success,
	},
	setButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.textSecondary,
	},
	restTime: {
		fontSize: 12,
		color: colors.textTertiary,
		marginTop: 12,
	},
	exerciseNotes: {
		fontSize: 13,
		color: colors.textSecondary,
		padding: 14,
		paddingTop: 0,
		fontStyle: 'italic',
	},
	// Modal styles
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.7)',
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: colors.surface,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 24,
		paddingBottom: 40,
	},
	modalTitle: {
		fontSize: 22,
		fontWeight: 'bold',
		color: colors.textPrimary,
		textAlign: 'center',
		marginBottom: 20,
	},
	summaryStats: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 40,
		marginBottom: 24,
	},
	summaryStat: {
		alignItems: 'center',
	},
	summaryStatValue: {
		fontSize: 28,
		fontWeight: 'bold',
		color: colors.textPrimary,
		marginTop: 8,
	},
	summaryStatLabel: {
		fontSize: 13,
		color: colors.textSecondary,
		marginTop: 4,
	},
	ratingLabel: {
		fontSize: 14,
		color: colors.textSecondary,
		textAlign: 'center',
		marginBottom: 12,
	},
	ratingRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 12,
		marginBottom: 24,
	},
	ratingButton: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: colors.background,
		justifyContent: 'center',
		alignItems: 'center',
	},
	ratingButtonActive: {
		backgroundColor: colors.primary,
		transform: [{ scale: 1.1 }],
	},
	ratingEmoji: {
		fontSize: 24,
	},
	modalActions: {
		flexDirection: 'row',
		gap: 12,
	},
	modalCancelButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: colors.background,
		alignItems: 'center',
	},
	modalCancelText: {
		color: colors.textSecondary,
		fontWeight: '600',
	},
	modalSaveButton: {
		flex: 2,
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: colors.primary,
		alignItems: 'center',
	},
	modalSaveText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
	},
	// Video w karcie ćwiczenia
	videoSection: {
		padding: 14,
		paddingTop: 0,
	},
	videoToggle: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 8,
	},
	videoToggleText: {
		color: colors.primary,
		fontWeight: '500',
		fontSize: 13,
	},
	videoWrapper: {
		position: 'relative',
		borderRadius: 10,
		overflow: 'hidden',
		marginTop: 8,
	},
	exerciseVideo: {
		width: '100%',
		height: 180,
		borderRadius: 10,
	},
	videoExpandHint: {
		position: 'absolute',
		bottom: 8,
		right: 8,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: 'rgba(0,0,0,0.6)',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
	},
	videoExpandText: {
		color: colors.textOnPrimary,
		fontSize: 12,
		fontWeight: '500',
	},
	// Modal szczegółów ćwiczenia
	detailModalContainer: {
		flex: 1,
		backgroundColor: colors.background,
	},
	detailModalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.surface,
	},
	detailModalTitle: {
		flex: 1,
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	detailCloseButton: {
		padding: 4,
	},
	detailModalContent: {
		flex: 1,
	},
	fullVideoContainer: {
		width: SCREEN_WIDTH,
		height: SCREEN_WIDTH * 0.75,
		backgroundColor: colors.surface,
	},
	fullVideo: {
		width: '100%',
		height: '100%',
	},
	noVideoFull: {
		width: SCREEN_WIDTH,
		height: 200,
		backgroundColor: colors.surface,
		justifyContent: 'center',
		alignItems: 'center',
	},
	noVideoText: {
		color: colors.textTertiary,
		marginTop: 8,
	},
	detailParams: {
		padding: 16,
		backgroundColor: colors.surface,
	},
	detailParamRow: {
		flexDirection: 'row',
		justifyContent: 'space-around',
	},
	detailParam: {
		alignItems: 'center',
	},
	detailParamValue: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.primary,
	},
	detailParamLabel: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 4,
	},
	detailSection: {
		padding: 16,
		paddingTop: 12,
	},
	detailBadges: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	detailBadge: {
		backgroundColor: colors.surface,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	detailBadgeText: {
		color: colors.textSecondary,
		fontSize: 13,
	},
	detailSectionTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: colors.textPrimary,
		marginBottom: 10,
	},
	muscleGroupsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	muscleChip: {
		backgroundColor: colors.primary + '20',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	muscleChipText: {
		color: colors.primary,
		fontSize: 13,
		fontWeight: '500',
	},
	detailInstructions: {
		color: colors.textSecondary,
		fontSize: 14,
		lineHeight: 22,
	},
	trainerNotes: {
		color: colors.textPrimary,
		fontSize: 14,
		lineHeight: 22,
		backgroundColor: colors.surface,
		padding: 14,
		borderRadius: 10,
		fontStyle: 'italic',
	},
})

