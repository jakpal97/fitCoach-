/**
 * CreatePlanScreen - Tworzenie planu treningowego
 *
 * Trener tworzy tygodniowy plan dla klienta:
 * - Wybór tygodnia
 * - Dodawanie dni treningowych
 * - Dodawanie ćwiczeń z biblioteki
 * - Ustawienie serii, powtórzeń, odpoczynku
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	TextInput,
	StyleSheet,
	Alert,
	ActivityIndicator,
	Modal,
	FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../context/AuthContext'
import {
	useCreatePlan,
	useAddWorkoutDay,
	useAddExerciseToWorkout,
	useDeleteWorkoutDay,
	useRemoveExerciseFromWorkout,
	usePlanDetails,
	getWeekDates,
	DAY_NAMES,
	type CreatePlanInput,
	type AddExerciseToWorkoutInput,
} from '../../api/services/trainingPlans'
import { useExercises, type Exercise } from '../../api/services/exercises'
import { useClientDetails } from '../../api/services/clients'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'

type CreatePlanRouteProp = RouteProp<AppStackParamList, 'CreatePlan'>

// ============================================
// TYPY LOKALNE
// ============================================

interface LocalWorkoutDay {
	id?: string
	day_of_week: number
	name: string
	is_rest_day: boolean
	exercises: LocalWorkoutExercise[]
}

interface LocalWorkoutExercise {
	id?: string
	exercise: Exercise
	sets: number
	reps: string
	weight_kg?: number
	rest_seconds: number
	notes?: string
}

// ============================================
// KOMPONENT WYBORU ĆWICZENIA
// ============================================

interface ExercisePickerModalProps {
	visible: boolean
	onClose: () => void
	onSelect: (exercise: Exercise) => void
	exercises: Exercise[]
	isLoading: boolean
}

function ExercisePickerModal({ visible, onClose, onSelect, exercises, isLoading }: ExercisePickerModalProps) {
	const [searchQuery, setSearchQuery] = useState('')

	const filteredExercises = useMemo(() => {
		if (!searchQuery.trim()) return exercises
		const query = searchQuery.toLowerCase()
		return exercises.filter(ex => ex.name.toLowerCase().includes(query) || ex.category.toLowerCase().includes(query))
	}, [exercises, searchQuery])

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<SafeAreaView style={styles.modalContainer}>
				{/* Header */}
				<View style={styles.modalHeader}>
					<Text style={styles.modalTitle}>Wybierz ćwiczenie</Text>
					<TouchableOpacity onPress={onClose}>
						<Ionicons name="close" size={28} color={colors.textPrimary} />
					</TouchableOpacity>
				</View>

				{/* Search */}
				<View style={styles.searchContainer}>
					<Ionicons name="search" size={20} color={colors.textSecondary} />
					<TextInput
						style={styles.searchInput}
						placeholder="Szukaj ćwiczenia..."
						placeholderTextColor={colors.textSecondary}
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
				</View>

				{/* Lista ćwiczeń */}
				{isLoading ? (
					<ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
				) : (
					<FlatList
						data={filteredExercises}
						keyExtractor={item => item.id}
						contentContainerStyle={styles.exerciseList}
						renderItem={({ item }) => (
							<TouchableOpacity
								style={styles.exerciseItem}
								onPress={() => {
									onSelect(item)
									onClose()
									setSearchQuery('')
								}}>
								<View style={styles.exerciseInfo}>
									<Text style={styles.exerciseName}>{item.name}</Text>
									<Text style={styles.exerciseCategory}>
										{item.category} • {item.difficulty}
									</Text>
								</View>
								<Ionicons name="add-circle" size={24} color={colors.primary} />
							</TouchableOpacity>
						)}
						ListEmptyComponent={<Text style={styles.emptyText}>Brak ćwiczeń</Text>}
					/>
				)}
			</SafeAreaView>
		</Modal>
	)
}

// ============================================
// KOMPONENT EDYCJI ĆWICZENIA W PLANIE
// ============================================

interface ExerciseEditorProps {
	exercise: LocalWorkoutExercise
	index: number
	onUpdate: (index: number, data: Partial<LocalWorkoutExercise>) => void
	onRemove: (index: number) => void
}

function ExerciseEditor({ exercise, index, onUpdate, onRemove }: ExerciseEditorProps) {
	return (
		<View style={styles.exerciseCard}>
			<View style={styles.exerciseHeader}>
				<View style={styles.exerciseOrderBadge}>
					<Text style={styles.exerciseOrderText}>{index + 1}</Text>
				</View>
				<Text style={styles.exerciseCardName} numberOfLines={1}>
					{exercise.exercise.name}
				</Text>
				<TouchableOpacity onPress={() => onRemove(index)}>
					<Ionicons name="trash-outline" size={20} color={colors.error} />
				</TouchableOpacity>
			</View>

			<View style={styles.exerciseParams}>
				{/* Serie */}
				<View style={styles.paramItem}>
					<Text style={styles.paramLabel}>Serie</Text>
					<TextInput
						style={styles.paramInput}
						value={String(exercise.sets)}
						onChangeText={text => onUpdate(index, { sets: parseInt(text) || 1 })}
						keyboardType="numeric"
						maxLength={2}
					/>
				</View>

				{/* Powtórzenia */}
				<View style={styles.paramItem}>
					<Text style={styles.paramLabel}>Powt.</Text>
					<TextInput
						style={styles.paramInput}
						value={exercise.reps}
						onChangeText={text => onUpdate(index, { reps: text })}
						placeholder="10-12"
						placeholderTextColor={colors.textTertiary}
					/>
				</View>

				{/* Obciążenie */}
				<View style={styles.paramItem}>
					<Text style={styles.paramLabel}>Kg</Text>
					<TextInput
						style={styles.paramInput}
						value={exercise.weight_kg ? String(exercise.weight_kg) : ''}
						onChangeText={text => onUpdate(index, { weight_kg: parseFloat(text) || undefined })}
						keyboardType="numeric"
						placeholder="-"
						placeholderTextColor={colors.textTertiary}
					/>
				</View>

				{/* Odpoczynek */}
				<View style={styles.paramItem}>
					<Text style={styles.paramLabel}>Odp. (s)</Text>
					<TextInput
						style={styles.paramInput}
						value={String(exercise.rest_seconds)}
						onChangeText={text => onUpdate(index, { rest_seconds: parseInt(text) || 60 })}
						keyboardType="numeric"
						maxLength={3}
					/>
				</View>
			</View>

			{/* Notatki */}
			<TextInput
				style={styles.notesInput}
				value={exercise.notes || ''}
				onChangeText={text => onUpdate(index, { notes: text })}
				placeholder="Notatki do ćwiczenia..."
				placeholderTextColor={colors.textTertiary}
				multiline
			/>
		</View>
	)
}

// ============================================
// KOMPONENT DNIA TRENINGOWEGO
// ============================================

interface WorkoutDayCardProps {
	day: LocalWorkoutDay
	dayIndex: number
	onUpdateDay: (index: number, data: Partial<LocalWorkoutDay>) => void
	onRemoveDay: (index: number) => void
	onAddExercise: (dayIndex: number) => void
	onUpdateExercise: (dayIndex: number, exIndex: number, data: Partial<LocalWorkoutExercise>) => void
	onRemoveExercise: (dayIndex: number, exIndex: number) => void
}

function WorkoutDayCard({
	day,
	dayIndex,
	onUpdateDay,
	onRemoveDay,
	onAddExercise,
	onUpdateExercise,
	onRemoveExercise,
}: WorkoutDayCardProps) {
	const [isExpanded, setIsExpanded] = useState(true)

	return (
		<View style={styles.dayCard}>
			{/* Header dnia */}
			<TouchableOpacity style={styles.dayHeader} onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
				<View style={styles.dayHeaderLeft}>
					<View style={[styles.dayBadge, day.is_rest_day && styles.restDayBadge]}>
						<Text style={styles.dayBadgeText}>{DAY_NAMES[day.day_of_week].slice(0, 3)}</Text>
					</View>
					<TextInput
						style={styles.dayNameInput}
						value={day.name}
						onChangeText={text => onUpdateDay(dayIndex, { name: text })}
						placeholder={`Dzień ${dayIndex + 1}`}
						placeholderTextColor={colors.textTertiary}
					/>
				</View>

				<View style={styles.dayHeaderRight}>
					{!day.is_rest_day && <Text style={styles.exerciseCount}>{day.exercises.length} ćw.</Text>}
					<Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
				</View>
			</TouchableOpacity>

			{/* Rozwinięta zawartość */}
			{isExpanded && (
				<View style={styles.dayContent}>
					{/* Toggle dzień odpoczynku */}
					<TouchableOpacity
						style={styles.restDayToggle}
						onPress={() => onUpdateDay(dayIndex, { is_rest_day: !day.is_rest_day })}>
						<View style={[styles.checkbox, day.is_rest_day && styles.checkboxChecked]}>
							{day.is_rest_day && <Ionicons name="checkmark" size={14} color="#fff" />}
						</View>
						<Text style={styles.restDayText}>Dzień odpoczynku</Text>
					</TouchableOpacity>

					{/* Lista ćwiczeń */}
					{!day.is_rest_day && (
						<>
							{day.exercises.map((exercise, exIndex) => (
								<ExerciseEditor
									key={exIndex}
									exercise={exercise}
									index={exIndex}
									onUpdate={(idx, data) => onUpdateExercise(dayIndex, idx, data)}
									onRemove={idx => onRemoveExercise(dayIndex, idx)}
								/>
							))}

							{/* Przycisk dodaj ćwiczenie */}
							<TouchableOpacity style={styles.addExerciseButton} onPress={() => onAddExercise(dayIndex)}>
								<Ionicons name="add" size={20} color={colors.primary} />
								<Text style={styles.addExerciseText}>Dodaj ćwiczenie</Text>
							</TouchableOpacity>
						</>
					)}

					{/* Usuń dzień */}
					<TouchableOpacity style={styles.removeDayButton} onPress={() => onRemoveDay(dayIndex)}>
						<Ionicons name="trash-outline" size={16} color={colors.error} />
						<Text style={styles.removeDayText}>Usuń dzień</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function CreatePlanScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const route = useRoute<CreatePlanRouteProp>()
	const { clientId } = route.params
	const { profile } = useAuth()

	// Stan formularza
	const { weekStart, weekEnd } = getWeekDates()
	const [selectedWeekStart, setSelectedWeekStart] = useState(weekStart)
	const [selectedWeekEnd, setSelectedWeekEnd] = useState(weekEnd)
	const [trainerNotes, setTrainerNotes] = useState('')
	const [workoutDays, setWorkoutDays] = useState<LocalWorkoutDay[]>([])
	const [isSubmitting, setIsSubmitting] = useState(false)

	// Modal wyboru ćwiczenia
	const [showExercisePicker, setShowExercisePicker] = useState(false)
	const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)

	// Dane
	const { data: client } = useClientDetails(clientId)
	const { data: exercises = [], isLoading: loadingExercises } = useExercises()
	const createPlan = useCreatePlan()
	const addWorkoutDay = useAddWorkoutDay()
	const addExerciseToWorkout = useAddExerciseToWorkout()

	// ============================================
	// HANDLERS - TYGODNIE
	// ============================================

	const handlePreviousWeek = useCallback(() => {
		const start = new Date(selectedWeekStart)
		start.setDate(start.getDate() - 7)
		const end = new Date(selectedWeekEnd)
		end.setDate(end.getDate() - 7)
		setSelectedWeekStart(start.toISOString().split('T')[0])
		setSelectedWeekEnd(end.toISOString().split('T')[0])
	}, [selectedWeekStart, selectedWeekEnd])

	const handleNextWeek = useCallback(() => {
		const start = new Date(selectedWeekStart)
		start.setDate(start.getDate() + 7)
		const end = new Date(selectedWeekEnd)
		end.setDate(end.getDate() + 7)
		setSelectedWeekStart(start.toISOString().split('T')[0])
		setSelectedWeekEnd(end.toISOString().split('T')[0])
	}, [selectedWeekStart, selectedWeekEnd])

	// ============================================
	// HANDLERS - DNI
	// ============================================

	const handleAddDay = useCallback(() => {
		// Znajdź pierwszy wolny dzień tygodnia
		const usedDays = workoutDays.map(d => d.day_of_week)
		const availableDays = [0, 1, 2, 3, 4, 5, 6].filter(d => !usedDays.includes(d))

		if (availableDays.length === 0) {
			Alert.alert('Uwaga', 'Wszystkie dni tygodnia są już dodane')
			return
		}

		const newDay: LocalWorkoutDay = {
			day_of_week: availableDays[0],
			name: '',
			is_rest_day: false,
			exercises: [],
		}

		setWorkoutDays(prev => [...prev, newDay].sort((a, b) => a.day_of_week - b.day_of_week))
	}, [workoutDays])

	const handleUpdateDay = useCallback((index: number, data: Partial<LocalWorkoutDay>) => {
		setWorkoutDays(prev => {
			const updated = [...prev]
			updated[index] = { ...updated[index], ...data }
			return updated
		})
	}, [])

	const handleRemoveDay = useCallback((index: number) => {
		Alert.alert('Usuń dzień', 'Czy na pewno chcesz usunąć ten dzień treningowy?', [
			{ text: 'Anuluj', style: 'cancel' },
			{
				text: 'Usuń',
				style: 'destructive',
				onPress: () => {
					setWorkoutDays(prev => prev.filter((_, i) => i !== index))
				},
			},
		])
	}, [])

	// ============================================
	// HANDLERS - ĆWICZENIA
	// ============================================

	const handleOpenExercisePicker = useCallback((dayIndex: number) => {
		setSelectedDayIndex(dayIndex)
		setShowExercisePicker(true)
	}, [])

	const handleSelectExercise = useCallback(
		(exercise: Exercise) => {
			if (selectedDayIndex === null) return

			const newExercise: LocalWorkoutExercise = {
				exercise,
				sets: exercise.typical_reps ? 3 : 3,
				reps: exercise.typical_reps || '10-12',
				rest_seconds: exercise.rest_seconds || 60,
			}

			setWorkoutDays(prev => {
				const updated = [...prev]
				updated[selectedDayIndex] = {
					...updated[selectedDayIndex],
					exercises: [...updated[selectedDayIndex].exercises, newExercise],
				}
				return updated
			})
		},
		[selectedDayIndex]
	)

	const handleUpdateExercise = useCallback((dayIndex: number, exIndex: number, data: Partial<LocalWorkoutExercise>) => {
		setWorkoutDays(prev => {
			const updated = [...prev]
			updated[dayIndex].exercises[exIndex] = {
				...updated[dayIndex].exercises[exIndex],
				...data,
			}
			return updated
		})
	}, [])

	const handleRemoveExercise = useCallback((dayIndex: number, exIndex: number) => {
		setWorkoutDays(prev => {
			const updated = [...prev]
			updated[dayIndex].exercises = updated[dayIndex].exercises.filter((_, i) => i !== exIndex)
			return updated
		})
	}, [])

	// ============================================
	// ZAPISYWANIE PLANU
	// ============================================

	const handleSavePlan = useCallback(async () => {
		if (!profile?.id) return

		if (workoutDays.length === 0) {
			Alert.alert('Uwaga', 'Dodaj przynajmniej jeden dzień treningowy')
			return
		}

		// Sprawdź czy każdy dzień (nie-odpoczynkowy) ma ćwiczenia
		const emptyDays = workoutDays.filter(d => !d.is_rest_day && d.exercises.length === 0)
		if (emptyDays.length > 0) {
			Alert.alert(
				'Uwaga',
				'Niektóre dni treningowe nie mają ćwiczeń. Dodaj ćwiczenia lub oznacz je jako dni odpoczynku.'
			)
			return
		}

		setIsSubmitting(true)

		try {
			// 1. Utwórz plan
			const plan = await createPlan.mutateAsync({
				trainerId: profile.id,
				input: {
					client_id: clientId,
					week_start: selectedWeekStart,
					week_end: selectedWeekEnd,
					trainer_notes: trainerNotes || undefined,
				},
			})

			// 2. Dodaj dni treningowe
			for (const day of workoutDays) {
				const createdDay = await addWorkoutDay.mutateAsync({
					plan_id: plan.id,
					day_of_week: day.day_of_week,
					name: day.name || undefined,
					is_rest_day: day.is_rest_day,
					order_index: day.day_of_week,
				})

				// 3. Dodaj ćwiczenia do dnia
				for (let i = 0; i < day.exercises.length; i++) {
					const ex = day.exercises[i]
					await addExerciseToWorkout.mutateAsync({
						workout_day_id: createdDay.id,
						exercise_id: ex.exercise.id,
						order_index: i,
						sets: ex.sets,
						reps: ex.reps,
						weight_kg: ex.weight_kg,
						rest_seconds: ex.rest_seconds,
						notes: ex.notes,
					})
				}
			}

			Alert.alert('Sukces', 'Plan treningowy został utworzony!', [{ text: 'OK', onPress: () => navigation.goBack() }])
		} catch (error: any) {
			console.error('Błąd tworzenia planu:', error)
			Alert.alert('Błąd', error.message || 'Nie udało się utworzyć planu')
		} finally {
			setIsSubmitting(false)
		}
	}, [
		profile?.id,
		workoutDays,
		clientId,
		selectedWeekStart,
		selectedWeekEnd,
		trainerNotes,
		createPlan,
		addWorkoutDay,
		addExerciseToWorkout,
		navigation,
	])

	// ============================================
	// FORMATOWANIE DAT
	// ============================================

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr)
		return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
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
				<View style={styles.headerCenter}>
					<Text style={styles.headerTitle}>Nowy plan</Text>
					{client && (
						<Text style={styles.headerSubtitle}>
							dla {client.first_name} {client.last_name}
						</Text>
					)}
				</View>
				<TouchableOpacity onPress={handleSavePlan} disabled={isSubmitting} style={styles.saveButton}>
					{isSubmitting ? (
						<ActivityIndicator size="small" color={colors.textOnPrimary} />
					) : (
						<Text style={styles.saveButtonText}>Zapisz</Text>
					)}
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}>
				{/* Wybór tygodnia */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Tydzień</Text>
					<View style={styles.weekSelector}>
						<TouchableOpacity style={styles.weekArrow} onPress={handlePreviousWeek}>
							<Ionicons name="chevron-back" size={24} color={colors.primary} />
						</TouchableOpacity>
						<View style={styles.weekDisplay}>
							<Text style={styles.weekText}>
								{formatDate(selectedWeekStart)} - {formatDate(selectedWeekEnd)}
							</Text>
						</View>
						<TouchableOpacity style={styles.weekArrow} onPress={handleNextWeek}>
							<Ionicons name="chevron-forward" size={24} color={colors.primary} />
						</TouchableOpacity>
					</View>
				</View>

				{/* Notatki trenera */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Notatki dla klienta</Text>
					<TextInput
						style={styles.notesTextArea}
						value={trainerNotes}
						onChangeText={setTrainerNotes}
						placeholder="Wskazówki, cele tygodnia, uwagi..."
						placeholderTextColor={colors.textTertiary}
						multiline
						numberOfLines={3}
					/>
				</View>

				{/* Dni treningowe */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Dni treningowe</Text>
						<TouchableOpacity style={styles.addDayButton} onPress={handleAddDay}>
							<Ionicons name="add" size={20} color={colors.textOnPrimary} />
							<Text style={styles.addDayText}>Dodaj dzień</Text>
						</TouchableOpacity>
					</View>

					{workoutDays.length === 0 ? (
						<View style={styles.emptyDays}>
							<Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
							<Text style={styles.emptyDaysText}>Brak dni treningowych. Kliknij "Dodaj dzień" aby rozpocząć.</Text>
						</View>
					) : (
						workoutDays.map((day, index) => (
							<WorkoutDayCard
								key={`${day.day_of_week}-${index}`}
								day={day}
								dayIndex={index}
								onUpdateDay={handleUpdateDay}
								onRemoveDay={handleRemoveDay}
								onAddExercise={handleOpenExercisePicker}
								onUpdateExercise={handleUpdateExercise}
								onRemoveExercise={handleRemoveExercise}
							/>
						))
					)}
				</View>
			</ScrollView>

			{/* Modal wyboru ćwiczenia */}
			<ExercisePickerModal
				visible={showExercisePicker}
				onClose={() => setShowExercisePicker(false)}
				onSelect={handleSelectExercise}
				exercises={exercises}
				isLoading={loadingExercises}
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
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.surface,
	},
	headerCenter: {
		flex: 1,
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	headerSubtitle: {
		fontSize: 13,
		color: colors.textSecondary,
		marginTop: 2,
	},
	saveButton: {
		backgroundColor: colors.primary,
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		minWidth: 70,
		alignItems: 'center',
	},
	saveButtonText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
		fontSize: 14,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 40,
	},
	section: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: colors.surface,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
		marginBottom: 12,
	},
	weekSelector: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	weekArrow: {
		padding: 8,
	},
	weekDisplay: {
		backgroundColor: colors.surface,
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 12,
		marginHorizontal: 12,
	},
	weekText: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	notesTextArea: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 14,
		fontSize: 15,
		color: colors.textPrimary,
		minHeight: 80,
		textAlignVertical: 'top',
	},
	addDayButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.primary,
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 8,
		gap: 6,
	},
	addDayText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
		fontSize: 13,
	},
	emptyDays: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyDaysText: {
		color: colors.textTertiary,
		fontSize: 14,
		textAlign: 'center',
		marginTop: 12,
		maxWidth: 250,
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
		backgroundColor: colors.surface,
	},
	dayHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	dayBadge: {
		backgroundColor: colors.primary,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 6,
		marginRight: 10,
	},
	restDayBadge: {
		backgroundColor: colors.textTertiary,
	},
	dayBadgeText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
		fontSize: 12,
	},
	dayNameInput: {
		flex: 1,
		fontSize: 15,
		color: colors.textPrimary,
		paddingVertical: 0,
	},
	dayHeaderRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	exerciseCount: {
		fontSize: 13,
		color: colors.textSecondary,
	},
	dayContent: {
		padding: 14,
		paddingTop: 0,
		borderTopWidth: 1,
		borderTopColor: colors.background,
	},
	restDayToggle: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: colors.textSecondary,
		marginRight: 10,
		justifyContent: 'center',
		alignItems: 'center',
	},
	checkboxChecked: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	restDayText: {
		fontSize: 14,
		color: colors.textSecondary,
	},
	exerciseCard: {
		backgroundColor: colors.background,
		borderRadius: 10,
		padding: 12,
		marginTop: 10,
	},
	exerciseHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
	},
	exerciseOrderBadge: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: colors.primary + '30',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 10,
	},
	exerciseOrderText: {
		color: colors.primary,
		fontSize: 12,
		fontWeight: '600',
	},
	exerciseCardName: {
		flex: 1,
		fontSize: 14,
		fontWeight: '500',
		color: colors.textPrimary,
	},
	exerciseParams: {
		flexDirection: 'row',
		gap: 8,
	},
	paramItem: {
		flex: 1,
	},
	paramLabel: {
		fontSize: 11,
		color: colors.textTertiary,
		marginBottom: 4,
	},
	paramInput: {
		backgroundColor: colors.surface,
		borderRadius: 6,
		paddingHorizontal: 10,
		paddingVertical: 8,
		fontSize: 14,
		color: colors.textPrimary,
		textAlign: 'center',
	},
	notesInput: {
		backgroundColor: colors.surface,
		borderRadius: 6,
		paddingHorizontal: 10,
		paddingVertical: 8,
		fontSize: 13,
		color: colors.textPrimary,
		marginTop: 10,
	},
	addExerciseButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		marginTop: 10,
		borderWidth: 1,
		borderColor: colors.primary,
		borderStyle: 'dashed',
		borderRadius: 8,
		gap: 6,
	},
	addExerciseText: {
		color: colors.primary,
		fontSize: 14,
		fontWeight: '500',
	},
	removeDayButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		marginTop: 10,
		gap: 6,
	},
	removeDayText: {
		color: colors.error,
		fontSize: 13,
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
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: 12,
		margin: 16,
		paddingHorizontal: 14,
		height: 48,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: colors.textPrimary,
		marginLeft: 10,
	},
	exerciseList: {
		paddingHorizontal: 16,
		paddingBottom: 40,
	},
	exerciseItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 14,
		marginBottom: 8,
	},
	exerciseInfo: {
		flex: 1,
	},
	exerciseName: {
		fontSize: 15,
		fontWeight: '500',
		color: colors.textPrimary,
	},
	exerciseCategory: {
		fontSize: 13,
		color: colors.textSecondary,
		marginTop: 2,
	},
	emptyText: {
		color: colors.textSecondary,
		textAlign: 'center',
		marginTop: 40,
	},
})
