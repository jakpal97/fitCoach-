/**
 * EditPlanScreen - Edycja planu treningowego
 *
 * Trener edytuje istniejący plan:
 * - Modyfikacja dni treningowych
 * - Dodawanie/usuwanie ćwiczeń
 * - Zmiana parametrów ćwiczeń
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
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
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import {
	usePlanDetails,
	useUpdatePlan,
	useAddWorkoutDay,
	useUpdateWorkoutDay,
	useDeleteWorkoutDay,
	useAddExerciseToWorkout,
	useUpdateWorkoutExercise,
	useRemoveExerciseFromWorkout,
	DAY_NAMES,
	type UpdatePlanInput,
	type WorkoutDayWithExercises,
	type WorkoutExerciseWithDetails,
} from '../../api/services/trainingPlans'
import { useExercises, type Exercise } from '../../api/services/exercises'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'

type EditPlanRouteProp = RouteProp<AppStackParamList, 'EditPlan'>

// ============================================
// TYPY LOKALNE
// ============================================

interface LocalWorkoutExercise {
	id?: string // ID z bazy (jeśli istnieje)
	exercise: Exercise
	sets: number
	reps: string
	weight_kg?: number
	rest_seconds: number
	notes?: string
	isNew?: boolean // Czy to nowo dodane ćwiczenie
	isModified?: boolean // Czy zostało zmodyfikowane
	isDeleted?: boolean // Czy ma być usunięte
}

interface LocalWorkoutDay {
	id?: string // ID z bazy (jeśli istnieje)
	day_of_week: number
	name: string
	is_rest_day: boolean
	exercises: LocalWorkoutExercise[]
	isNew?: boolean
	isModified?: boolean
	isDeleted?: boolean
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
		return exercises.filter(ex => 
			ex.name.toLowerCase().includes(query) || 
			ex.category.toLowerCase().includes(query)
		)
	}, [exercises, searchQuery])

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<SafeAreaView style={styles.modalContainer}>
				<View style={styles.modalHeader}>
					<Text style={styles.modalTitle}>Wybierz ćwiczenie</Text>
					<TouchableOpacity onPress={onClose}>
						<Ionicons name="close" size={28} color={colors.textPrimary} />
					</TouchableOpacity>
				</View>

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
// KOMPONENT EDYCJI ĆWICZENIA
// ============================================

interface ExerciseEditorProps {
	exercise: LocalWorkoutExercise
	index: number
	onUpdate: (index: number, data: Partial<LocalWorkoutExercise>) => void
	onRemove: (index: number) => void
}

function ExerciseEditor({ exercise, index, onUpdate, onRemove }: ExerciseEditorProps) {
	if (exercise.isDeleted) return null

	return (
		<View style={[styles.exerciseCard, exercise.isNew && styles.exerciseCardNew]}>
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
						onChangeText={text => onUpdate(index, { sets: parseInt(text) || 1, isModified: true })}
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
						onChangeText={text => onUpdate(index, { reps: text, isModified: true })}
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
						onChangeText={text => onUpdate(index, { weight_kg: parseFloat(text) || undefined, isModified: true })}
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
						onChangeText={text => onUpdate(index, { rest_seconds: parseInt(text) || 60, isModified: true })}
						keyboardType="numeric"
						maxLength={3}
					/>
				</View>
			</View>

			{/* Notatki */}
			<TextInput
				style={styles.notesInput}
				value={exercise.notes || ''}
				onChangeText={text => onUpdate(index, { notes: text, isModified: true })}
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

	if (day.isDeleted) return null

	const visibleExercises = day.exercises.filter(ex => !ex.isDeleted)

	return (
		<View style={[styles.dayCard, day.isNew && styles.dayCardNew]}>
			<TouchableOpacity style={styles.dayHeader} onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
				<View style={styles.dayHeaderLeft}>
					<View style={[styles.dayBadge, day.is_rest_day && styles.restDayBadge]}>
						<Text style={styles.dayBadgeText}>{DAY_NAMES[day.day_of_week].slice(0, 3)}</Text>
					</View>
					<TextInput
						style={styles.dayNameInput}
						value={day.name}
						onChangeText={text => onUpdateDay(dayIndex, { name: text, isModified: true })}
						placeholder={DAY_NAMES[day.day_of_week]}
						placeholderTextColor={colors.textTertiary}
					/>
				</View>

				<View style={styles.dayHeaderRight}>
					{!day.is_rest_day && <Text style={styles.exerciseCount}>{visibleExercises.length} ćw.</Text>}
					<Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
				</View>
			</TouchableOpacity>

			{isExpanded && (
				<View style={styles.dayContent}>
					{/* Toggle dzień odpoczynku */}
					<TouchableOpacity
						style={styles.restDayToggle}
						onPress={() => onUpdateDay(dayIndex, { is_rest_day: !day.is_rest_day, isModified: true })}>
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
									key={exercise.id || `new-${exIndex}`}
									exercise={exercise}
									index={exIndex}
									onUpdate={(idx, data) => onUpdateExercise(dayIndex, idx, data)}
									onRemove={idx => onRemoveExercise(dayIndex, idx)}
								/>
							))}

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

export default function EditPlanScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const route = useRoute<EditPlanRouteProp>()
	const { planId } = route.params
	const { profile } = useAuth()
	const queryClient = useQueryClient()

	// Pobierz istniejący plan
	const { data: existingPlan, isLoading: loadingPlan } = usePlanDetails(planId)

	// Stan formularza
	const [trainerNotes, setTrainerNotes] = useState('')
	const [workoutDays, setWorkoutDays] = useState<LocalWorkoutDay[]>([])
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [hasChanges, setHasChanges] = useState(false)

	// Modal wyboru ćwiczenia
	const [showExercisePicker, setShowExercisePicker] = useState(false)
	const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)

	// Dane
	const { data: exercises = [], isLoading: loadingExercises } = useExercises()
	
	// Mutacje
	const updatePlan = useUpdatePlan()
	const addWorkoutDay = useAddWorkoutDay()
	const updateWorkoutDay = useUpdateWorkoutDay()
	const deleteWorkoutDay = useDeleteWorkoutDay()
	const addExerciseToWorkout = useAddExerciseToWorkout()
	const updateWorkoutExercise = useUpdateWorkoutExercise()
	const removeExerciseFromWorkout = useRemoveExerciseFromWorkout()

	// ============================================
	// INICJALIZACJA DANYCH Z ISTNIEJĄCEGO PLANU
	// ============================================

	useEffect(() => {
		if (existingPlan) {
			setTrainerNotes(existingPlan.trainer_notes || '')
			
			// Mapuj dni treningowe
			const days: LocalWorkoutDay[] = (existingPlan.workout_days || []).map((day: WorkoutDayWithExercises) => ({
				id: day.id,
				day_of_week: day.day_of_week,
				name: day.name || '',
				is_rest_day: day.is_rest_day,
				exercises: (day.workout_exercises || []).map((ex: WorkoutExerciseWithDetails) => ({
					id: ex.id,
					exercise: ex.exercise as Exercise,
					sets: ex.sets,
					reps: ex.reps,
					weight_kg: ex.weight_kg || undefined,
					rest_seconds: ex.rest_seconds,
					notes: ex.notes || undefined,
				})),
			}))
			
			setWorkoutDays(days.sort((a, b) => a.day_of_week - b.day_of_week))
		}
	}, [existingPlan])

	// ============================================
	// HANDLERS - DNI
	// ============================================

	const handleAddDay = useCallback(() => {
		const usedDays = workoutDays.filter(d => !d.isDeleted).map(d => d.day_of_week)
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
			isNew: true,
		}

		setWorkoutDays(prev => [...prev, newDay].sort((a, b) => a.day_of_week - b.day_of_week))
		setHasChanges(true)
	}, [workoutDays])

	const handleUpdateDay = useCallback((index: number, data: Partial<LocalWorkoutDay>) => {
		setWorkoutDays(prev => {
			const updated = [...prev]
			updated[index] = { ...updated[index], ...data }
			return updated
		})
		setHasChanges(true)
	}, [])

	const handleRemoveDay = useCallback((index: number) => {
		Alert.alert('Usuń dzień', 'Czy na pewno chcesz usunąć ten dzień treningowy?', [
			{ text: 'Anuluj', style: 'cancel' },
			{
				text: 'Usuń',
				style: 'destructive',
				onPress: () => {
					setWorkoutDays(prev => {
						const updated = [...prev]
						if (updated[index].id) {
							// Istniejący dzień - oznacz jako usunięty
							updated[index] = { ...updated[index], isDeleted: true }
						} else {
							// Nowy dzień - usuń z listy
							return prev.filter((_, i) => i !== index)
						}
						return updated
					})
					setHasChanges(true)
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
				sets: 3,
				reps: exercise.typical_reps || '10-12',
				rest_seconds: exercise.rest_seconds || 60,
				isNew: true,
			}

			setWorkoutDays(prev => {
				const updated = [...prev]
				updated[selectedDayIndex] = {
					...updated[selectedDayIndex],
					exercises: [...updated[selectedDayIndex].exercises, newExercise],
					isModified: true,
				}
				return updated
			})
			setHasChanges(true)
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
		setHasChanges(true)
	}, [])

	const handleRemoveExercise = useCallback((dayIndex: number, exIndex: number) => {
		setWorkoutDays(prev => {
			const updated = [...prev]
			const exercise = updated[dayIndex].exercises[exIndex]
			
			if (exercise.id) {
				// Istniejące ćwiczenie - oznacz jako usunięte
				updated[dayIndex].exercises[exIndex] = { ...exercise, isDeleted: true }
			} else {
				// Nowe ćwiczenie - usuń z listy
				updated[dayIndex].exercises = updated[dayIndex].exercises.filter((_, i) => i !== exIndex)
			}
			return updated
		})
		setHasChanges(true)
	}, [])

	// ============================================
	// ZAPISYWANIE ZMIAN
	// ============================================

	const handleSaveChanges = useCallback(async () => {
		if (!profile?.id || !existingPlan) return

		const visibleDays = workoutDays.filter(d => !d.isDeleted)
		
		// Walidacja
		const emptyDays = visibleDays.filter(d => 
			!d.is_rest_day && d.exercises.filter(ex => !ex.isDeleted).length === 0
		)
		if (emptyDays.length > 0) {
			Alert.alert(
				'Uwaga',
				'Niektóre dni treningowe nie mają ćwiczeń. Dodaj ćwiczenia lub oznacz je jako dni odpoczynku.'
			)
			return
		}

		setIsSubmitting(true)

		try {
			// 1. Zaktualizuj notatki planu
			if (trainerNotes !== existingPlan.trainer_notes) {
				await updatePlan.mutateAsync({
					planId,
					data: { trainer_notes: trainerNotes },
				})
			}

			// 2. Przetwórz dni treningowe
			for (const day of workoutDays) {
				if (day.isDeleted && day.id) {
					// Usuń istniejący dzień
					await deleteWorkoutDay.mutateAsync(day.id)
					continue
				}

				if (day.isNew) {
					// Dodaj nowy dzień
					const newDay = await addWorkoutDay.mutateAsync({
						plan_id: planId,
						day_of_week: day.day_of_week,
						name: day.name || DAY_NAMES[day.day_of_week],
						is_rest_day: day.is_rest_day,
					})

					// Dodaj ćwiczenia do nowego dnia
					if (!day.is_rest_day) {
						for (let i = 0; i < day.exercises.length; i++) {
							const ex = day.exercises[i]
							await addExerciseToWorkout.mutateAsync({
								workout_day_id: newDay.id,
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
					continue
				}

				// Zaktualizuj istniejący dzień (jeśli zmodyfikowany)
				if (day.isModified && day.id) {
					await updateWorkoutDay.mutateAsync({
						dayId: day.id,
						input: {
							name: day.name || DAY_NAMES[day.day_of_week],
							is_rest_day: day.is_rest_day,
						},
					})
				}

				// Przetwórz ćwiczenia w dniu
				if (day.id && !day.is_rest_day) {
					for (let i = 0; i < day.exercises.length; i++) {
						const ex = day.exercises[i]

						if (ex.isDeleted && ex.id) {
							// Usuń ćwiczenie
							await removeExerciseFromWorkout.mutateAsync(ex.id)
							continue
						}

						if (ex.isNew) {
							// Dodaj nowe ćwiczenie
							await addExerciseToWorkout.mutateAsync({
								workout_day_id: day.id,
								exercise_id: ex.exercise.id,
								order_index: i,
								sets: ex.sets,
								reps: ex.reps,
								weight_kg: ex.weight_kg,
								rest_seconds: ex.rest_seconds,
								notes: ex.notes,
							})
							continue
						}

						if (ex.isModified && ex.id) {
							// Zaktualizuj ćwiczenie
							await updateWorkoutExercise.mutateAsync({
								exerciseId: ex.id,
								data: {
									order_index: i,
									sets: ex.sets,
									reps: ex.reps,
									weight_kg: ex.weight_kg,
									rest_seconds: ex.rest_seconds,
									notes: ex.notes,
								},
							})
						}
					}
				}
			}

			// Odśwież dane
			queryClient.invalidateQueries({ queryKey: ['plan-details', planId] })
			queryClient.invalidateQueries({ queryKey: ['plans-by-client'] })

			Alert.alert('Sukces', 'Plan został zaktualizowany!', [
				{ text: 'OK', onPress: () => navigation.goBack() },
			])
		} catch (error: any) {
			console.error('Błąd zapisywania planu:', error)
			Alert.alert('Błąd', error.message || 'Nie udało się zapisać zmian')
		} finally {
			setIsSubmitting(false)
		}
	}, [
		profile?.id,
		existingPlan,
		planId,
		trainerNotes,
		workoutDays,
		updatePlan,
		addWorkoutDay,
		updateWorkoutDay,
		deleteWorkoutDay,
		addExerciseToWorkout,
		updateWorkoutExercise,
		removeExerciseFromWorkout,
		queryClient,
		navigation,
	])

	const handleCancel = useCallback(() => {
		if (hasChanges) {
			Alert.alert('Porzucić zmiany?', 'Wszystkie niezapisane zmiany zostaną utracone.', [
				{ text: 'Zostań', style: 'cancel' },
				{ text: 'Porzuć', style: 'destructive', onPress: () => navigation.goBack() },
			])
		} else {
			navigation.goBack()
		}
	}, [hasChanges, navigation])

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

	if (loadingPlan) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={styles.loadingText}>Ładowanie planu...</Text>
				</View>
			</SafeAreaView>
		)
	}

	if (!existingPlan) {
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

	const visibleDays = workoutDays.filter(d => !d.isDeleted)

	// ============================================
	// RENDER
	// ============================================

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={handleCancel}>
					<Ionicons name="close" size={28} color={colors.textPrimary} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Edytuj plan</Text>
				<TouchableOpacity
					style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
					onPress={handleSaveChanges}
					disabled={isSubmitting || !hasChanges}>
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
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled">
				
				{/* Informacje o planie */}
				<View style={styles.planInfoCard}>
					<View style={styles.planInfoRow}>
						<Ionicons name="calendar" size={20} color={colors.primary} />
						<Text style={styles.planInfoText}>
							{formatDate(existingPlan.week_start)} - {formatDate(existingPlan.week_end)}
						</Text>
					</View>
					{existingPlan.profiles && (
						<View style={styles.planInfoRow}>
							<Ionicons name="person" size={18} color={colors.textSecondary} />
							<Text style={styles.clientName}>
								{existingPlan.profiles.first_name} {existingPlan.profiles.last_name}
							</Text>
						</View>
					)}
				</View>

				{/* Notatki trenera */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Notatki</Text>
					<TextInput
						style={styles.notesInput}
						value={trainerNotes}
						onChangeText={(text) => {
							setTrainerNotes(text)
							setHasChanges(true)
						}}
						placeholder="Wpisz notatki dla klienta..."
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
							<Ionicons name="add" size={18} color={colors.primary} />
							<Text style={styles.addDayText}>Dodaj dzień</Text>
						</TouchableOpacity>
					</View>

					{visibleDays.length === 0 ? (
						<View style={styles.emptyDays}>
							<Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
							<Text style={styles.emptyText}>Brak dni treningowych</Text>
							<TouchableOpacity style={styles.addFirstDayButton} onPress={handleAddDay}>
								<Text style={styles.addFirstDayText}>Dodaj pierwszy dzień</Text>
							</TouchableOpacity>
						</View>
					) : (
						workoutDays.map((day, index) => (
							<WorkoutDayCard
								key={day.id || `new-${index}`}
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
	saveButton: {
		backgroundColor: colors.primary,
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		minWidth: 80,
		alignItems: 'center',
	},
	saveButtonDisabled: {
		opacity: 0.5,
	},
	saveButtonText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
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
		gap: 8,
	},
	planInfoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	planInfoText: {
		fontSize: 15,
		fontWeight: '500',
		color: colors.textPrimary,
	},
	clientName: {
		fontSize: 14,
		color: colors.textSecondary,
	},
	section: {
		paddingHorizontal: 16,
		marginBottom: 20,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	addDayButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	addDayText: {
		color: colors.primary,
		fontWeight: '500',
	},
	notesInput: {
		backgroundColor: colors.surface,
		borderRadius: 10,
		padding: 14,
		color: colors.textPrimary,
		fontSize: 14,
		minHeight: 80,
		textAlignVertical: 'top',
	},
	dayCard: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		marginBottom: 12,
		overflow: 'hidden',
	},
	dayCardNew: {
		borderColor: colors.success,
		borderWidth: 2,
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
		flex: 1,
		gap: 10,
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
	dayNameInput: {
		flex: 1,
		color: colors.textPrimary,
		fontSize: 15,
		fontWeight: '500',
		padding: 0,
	},
	dayHeaderRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	exerciseCount: {
		color: colors.textSecondary,
		fontSize: 13,
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
		gap: 10,
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: colors.textTertiary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	checkboxChecked: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	restDayText: {
		color: colors.textSecondary,
		fontSize: 14,
	},
	exerciseCard: {
		backgroundColor: colors.background,
		borderRadius: 10,
		padding: 12,
		marginBottom: 10,
	},
	exerciseCardNew: {
		borderColor: colors.success,
		borderWidth: 1,
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
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	exerciseOrderText: {
		color: colors.primary,
		fontWeight: '600',
		fontSize: 12,
	},
	exerciseCardName: {
		flex: 1,
		color: colors.textPrimary,
		fontWeight: '500',
		fontSize: 14,
	},
	exerciseParams: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 10,
	},
	paramItem: {
		flex: 1,
	},
	paramLabel: {
		color: colors.textTertiary,
		fontSize: 11,
		marginBottom: 4,
	},
	paramInput: {
		backgroundColor: colors.surface,
		borderRadius: 6,
		padding: 8,
		color: colors.textPrimary,
		fontSize: 14,
		textAlign: 'center',
	},
	addExerciseButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.primary,
		borderStyle: 'dashed',
		gap: 6,
		marginTop: 4,
	},
	addExerciseText: {
		color: colors.primary,
		fontWeight: '500',
	},
	removeDayButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 12,
		paddingVertical: 8,
		gap: 6,
	},
	removeDayText: {
		color: colors.error,
		fontSize: 13,
	},
	emptyDays: {
		alignItems: 'center',
		paddingVertical: 40,
		backgroundColor: colors.surface,
		borderRadius: 12,
	},
	emptyText: {
		color: colors.textTertiary,
		marginTop: 12,
		marginBottom: 16,
	},
	addFirstDayButton: {
		backgroundColor: colors.primary,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
	},
	addFirstDayText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
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
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		margin: 16,
		paddingHorizontal: 14,
		borderRadius: 10,
		gap: 10,
	},
	searchInput: {
		flex: 1,
		color: colors.textPrimary,
		paddingVertical: 12,
		fontSize: 15,
	},
	exerciseList: {
		padding: 16,
		paddingTop: 0,
	},
	exerciseItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		padding: 14,
		borderRadius: 10,
		marginBottom: 8,
	},
	exerciseInfo: {
		flex: 1,
	},
	exerciseName: {
		color: colors.textPrimary,
		fontWeight: '500',
		fontSize: 15,
	},
	exerciseCategory: {
		color: colors.textSecondary,
		fontSize: 13,
		marginTop: 2,
	},
})

