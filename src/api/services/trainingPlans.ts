/**
 * Serwis planów treningowych FitCoach
 *
 * Obsługuje CRUD planów treningowych z dniami i ćwiczeniami.
 * Trener tworzy tygodniowe plany dla swoich klientów.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '../supabase'
import type {
	TrainingPlan,
	WorkoutDay,
	WorkoutExercise,
	Exercise,
} from '../../types'

// ============================================
// TYPY
// ============================================

/**
 * Plan treningowy z dniami i ćwiczeniami
 */
export interface TrainingPlanWithDetails extends TrainingPlan {
	workout_days: WorkoutDayWithExercises[]
	// Dane klienta (dla listy trenera)
	profiles?: {
		first_name: string
		last_name: string
	}
}

/**
 * Dzień treningowy z ćwiczeniami
 */
export interface WorkoutDayWithExercises extends WorkoutDay {
	workout_exercises: WorkoutExerciseWithDetails[]
}

/**
 * Ćwiczenie w treningu ze szczegółami ćwiczenia
 */
export interface WorkoutExerciseWithDetails extends WorkoutExercise {
	exercise: Exercise
}

/**
 * Dane do tworzenia planu (tygodniowego)
 */
export interface CreatePlanInput {
	client_id: string
	week_start: string // Format: YYYY-MM-DD (poniedziałek)
	week_end: string   // Format: YYYY-MM-DD (niedziela)
	trainer_notes?: string
}

/**
 * Dane do aktualizacji planu
 */
export interface UpdatePlanInput {
	week_start?: string
	week_end?: string
	trainer_notes?: string
	is_active?: boolean
}

/**
 * Dane do tworzenia dnia treningowego
 */
export interface CreateWorkoutDayInput {
	plan_id: string
	day_of_week: number // 0 = poniedziałek, 6 = niedziela
	name?: string
	is_rest_day?: boolean
	order_index?: number
}

/**
 * Dane do aktualizacji dnia treningowego
 */
export interface UpdateWorkoutDayInput {
	name?: string
	is_rest_day?: boolean
	order_index?: number
}

/**
 * Dane do dodania ćwiczenia do dnia
 */
export interface AddExerciseToWorkoutInput {
	workout_day_id: string
	exercise_id: string
	order_index: number
	sets: number
	reps: string
	weight_kg?: number
	rest_seconds?: number
	notes?: string
}

/**
 * Dane do aktualizacji ćwiczenia w dniu
 */
export interface UpdateWorkoutExerciseInput {
	sets?: number
	reps?: string
	weight_kg?: number
	rest_seconds?: number
	notes?: string
	order_index?: number
}

// ============================================
// KLUCZE QUERY
// ============================================

export const planKeys = {
	all: ['training-plans'] as const,
	lists: () => [...planKeys.all, 'list'] as const,
	listByClient: (clientId: string) => [...planKeys.lists(), 'client', clientId] as const,
	listByTrainer: (trainerId: string) => [...planKeys.lists(), 'trainer', trainerId] as const,
	details: () => [...planKeys.all, 'detail'] as const,
	detail: (id: string) => [...planKeys.details(), id] as const,
}

// ============================================
// HELPER: Oblicz daty tygodnia
// ============================================

/**
 * Zwraca daty początku i końca tygodnia dla podanej daty
 */
export function getWeekDates(date: Date = new Date()): { weekStart: string; weekEnd: string } {
	const d = new Date(date)
	const day = d.getDay()
	const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Dostosuj gdy niedziela
	
	const monday = new Date(d.setDate(diff))
	const sunday = new Date(monday)
	sunday.setDate(monday.getDate() + 6)
	
	return {
		weekStart: monday.toISOString().split('T')[0],
		weekEnd: sunday.toISOString().split('T')[0],
	}
}

/**
 * Nazwy dni tygodnia
 */
export const DAY_NAMES = [
	'Poniedziałek',
	'Wtorek',
	'Środa',
	'Czwartek',
	'Piątek',
	'Sobota',
	'Niedziela',
]

// ============================================
// FUNKCJE API - PLANY
// ============================================

/**
 * Pobiera plany treningowe dla klienta
 */
export async function getPlansByClient(clientId: string): Promise<TrainingPlan[]> {
	const { data, error } = await supabase
		.from('training_plans')
		.select('*')
		.eq('client_id', clientId)
		.order('week_start', { ascending: false })

	if (error) throw handleSupabaseError(error)
	return data as TrainingPlan[]
}

/**
 * Pobiera plany treningowe stworzone przez trenera
 */
export async function getPlansByTrainer(trainerId: string): Promise<TrainingPlanWithDetails[]> {
	const { data, error } = await supabase
		.from('training_plans')
		.select('*, profiles:client_id(first_name, last_name)')
		.eq('trainer_id', trainerId)
		.order('week_start', { ascending: false })

	if (error) throw handleSupabaseError(error)
	return data as TrainingPlanWithDetails[]
}

/**
 * Pobiera aktywny plan dla klienta (bieżący tydzień)
 */
export async function getActivePlanForClient(clientId: string): Promise<TrainingPlanWithDetails | null> {
	const { weekStart, weekEnd } = getWeekDates()
	
	const { data, error } = await supabase
		.from('training_plans')
		.select(`
			*,
			workout_days (
				*,
				workout_exercises (
					*,
					exercise:exercises (*)
				)
			)
		`)
		.eq('client_id', clientId)
		.eq('is_active', true)
		.lte('week_start', weekEnd)
		.gte('week_end', weekStart)
		.single()

	if (error) {
		if (error.code === 'PGRST116') return null // Brak aktywnego planu
		throw handleSupabaseError(error)
	}

	// Posortuj dni i ćwiczenia
	if (data?.workout_days) {
		data.workout_days.sort((a: WorkoutDay, b: WorkoutDay) => a.day_of_week - b.day_of_week)
		data.workout_days.forEach((day: WorkoutDayWithExercises) => {
			if (day.workout_exercises) {
				day.workout_exercises.sort((a: WorkoutExercise, b: WorkoutExercise) => a.order_index - b.order_index)
			}
		})
	}

	return data as TrainingPlanWithDetails
}

/**
 * Pobiera szczegóły planu z dniami i ćwiczeniami
 */
export async function getPlanDetails(planId: string): Promise<TrainingPlanWithDetails | null> {
	const { data, error } = await supabase
		.from('training_plans')
		.select(`
			*,
			profiles:client_id(first_name, last_name),
			workout_days (
				*,
				workout_exercises (
					*,
					exercise:exercises (*)
				)
			)
		`)
		.eq('id', planId)
		.single()

	if (error) {
		if (error.code === 'PGRST116') return null
		throw handleSupabaseError(error)
	}

	// Posortuj dni i ćwiczenia
	if (data?.workout_days) {
		data.workout_days.sort((a: WorkoutDay, b: WorkoutDay) => a.day_of_week - b.day_of_week)
		data.workout_days.forEach((day: WorkoutDayWithExercises) => {
			if (day.workout_exercises) {
				day.workout_exercises.sort((a: WorkoutExercise, b: WorkoutExercise) => a.order_index - b.order_index)
			}
		})
	}

	return data as TrainingPlanWithDetails
}

/**
 * Tworzy nowy plan treningowy na tydzień
 */
export async function createPlan(trainerId: string, input: CreatePlanInput): Promise<TrainingPlan> {
	// Najpierw dezaktywuj inne aktywne plany dla tego klienta w tym samym tygodniu
	await supabase
		.from('training_plans')
		.update({ is_active: false })
		.eq('client_id', input.client_id)
		.eq('is_active', true)
		.eq('week_start', input.week_start)

	const { data, error } = await supabase
		.from('training_plans')
		.insert({
			trainer_id: trainerId,
			client_id: input.client_id,
			week_start: input.week_start,
			week_end: input.week_end,
			trainer_notes: input.trainer_notes,
			is_active: true,
		})
		.select()
		.single()

	if (error) throw handleSupabaseError(error)
	return data as TrainingPlan
}

/**
 * Aktualizuje plan treningowy
 */
export async function updatePlan(planId: string, input: UpdatePlanInput): Promise<TrainingPlan> {
	const { data, error } = await supabase
		.from('training_plans')
		.update(input)
		.eq('id', planId)
		.select()
		.single()

	if (error) throw handleSupabaseError(error)
	return data as TrainingPlan
}

/**
 * Usuwa plan treningowy
 */
export async function deletePlan(planId: string): Promise<void> {
	const { error } = await supabase
		.from('training_plans')
		.delete()
		.eq('id', planId)

	if (error) throw handleSupabaseError(error)
}

/**
 * Duplikuje plan na następny tydzień
 */
export async function duplicatePlanToNextWeek(planId: string): Promise<TrainingPlan> {
	// Pobierz oryginalny plan z dniami i ćwiczeniami
	const original = await getPlanDetails(planId)
	if (!original) throw new Error('Plan nie został znaleziony')

	// Oblicz daty następnego tygodnia
	const originalStart = new Date(original.week_start)
	originalStart.setDate(originalStart.getDate() + 7)
	const nextWeekStart = originalStart.toISOString().split('T')[0]
	
	const originalEnd = new Date(original.week_end)
	originalEnd.setDate(originalEnd.getDate() + 7)
	const nextWeekEnd = originalEnd.toISOString().split('T')[0]

	// Stwórz nowy plan
	const newPlan = await createPlan(original.trainer_id, {
		client_id: original.client_id,
		week_start: nextWeekStart,
		week_end: nextWeekEnd,
		trainer_notes: original.trainer_notes || undefined,
	})

	// Skopiuj dni treningowe z ćwiczeniami
	for (const day of original.workout_days || []) {
		const newDay = await addWorkoutDay({
			plan_id: newPlan.id,
			day_of_week: day.day_of_week,
			name: day.name || undefined,
			is_rest_day: day.is_rest_day,
			order_index: day.order_index,
		})

		// Skopiuj ćwiczenia
		for (const exercise of day.workout_exercises || []) {
			await addExerciseToWorkout({
				workout_day_id: newDay.id,
				exercise_id: exercise.exercise_id,
				order_index: exercise.order_index,
				sets: exercise.sets,
				reps: exercise.reps,
				weight_kg: exercise.weight_kg || undefined,
				rest_seconds: exercise.rest_seconds,
				notes: exercise.notes || undefined,
			})
		}
	}

	return newPlan
}

// ============================================
// FUNKCJE API - DNI TRENINGOWE
// ============================================

/**
 * Dodaje dzień treningowy do planu
 */
export async function addWorkoutDay(input: CreateWorkoutDayInput): Promise<WorkoutDay> {
	const { data, error } = await supabase
		.from('workout_days')
		.insert({
			plan_id: input.plan_id,
			day_of_week: input.day_of_week,
			name: input.name,
			is_rest_day: input.is_rest_day ?? false,
			order_index: input.order_index ?? input.day_of_week,
		})
		.select()
		.single()

	if (error) throw handleSupabaseError(error)
	return data as WorkoutDay
}

/**
 * Aktualizuje dzień treningowy
 */
export async function updateWorkoutDay(dayId: string, input: UpdateWorkoutDayInput): Promise<WorkoutDay> {
	const { data, error } = await supabase
		.from('workout_days')
		.update(input)
		.eq('id', dayId)
		.select()
		.single()

	if (error) throw handleSupabaseError(error)
	return data as WorkoutDay
}

/**
 * Usuwa dzień treningowy
 */
export async function deleteWorkoutDay(dayId: string): Promise<void> {
	const { error } = await supabase
		.from('workout_days')
		.delete()
		.eq('id', dayId)

	if (error) throw handleSupabaseError(error)
}

// ============================================
// FUNKCJE API - ĆWICZENIA W DNIU
// ============================================

/**
 * Dodaje ćwiczenie do dnia treningowego
 */
export async function addExerciseToWorkout(input: AddExerciseToWorkoutInput): Promise<WorkoutExercise> {
	const { data, error } = await supabase
		.from('workout_exercises')
		.insert({
			workout_day_id: input.workout_day_id,
			exercise_id: input.exercise_id,
			order_index: input.order_index,
			sets: input.sets,
			reps: input.reps,
			weight_kg: input.weight_kg,
			rest_seconds: input.rest_seconds ?? 60,
			notes: input.notes,
		})
		.select()
		.single()

	if (error) throw handleSupabaseError(error)
	return data as WorkoutExercise
}

/**
 * Aktualizuje ćwiczenie w dniu treningowym
 */
export async function updateWorkoutExercise(
	workoutExerciseId: string,
	input: UpdateWorkoutExerciseInput
): Promise<WorkoutExercise> {
	const { data, error } = await supabase
		.from('workout_exercises')
		.update(input)
		.eq('id', workoutExerciseId)
		.select()
		.single()

	if (error) throw handleSupabaseError(error)
	return data as WorkoutExercise
}

/**
 * Usuwa ćwiczenie z dnia treningowego
 */
export async function removeExerciseFromWorkout(workoutExerciseId: string): Promise<void> {
	const { error } = await supabase
		.from('workout_exercises')
		.delete()
		.eq('id', workoutExerciseId)

	if (error) throw handleSupabaseError(error)
}

/**
 * Zmienia kolejność ćwiczeń w dniu
 */
export async function reorderWorkoutExercises(
	workoutDayId: string,
	exerciseIds: string[]
): Promise<void> {
	for (let i = 0; i < exerciseIds.length; i++) {
		const { error } = await supabase
			.from('workout_exercises')
			.update({ order_index: i })
			.eq('id', exerciseIds[i])
			.eq('workout_day_id', workoutDayId)

		if (error) throw handleSupabaseError(error)
	}
}

// ============================================
// REACT QUERY HOOKS
// ============================================

/**
 * Hook do pobierania planów klienta
 */
export function useClientPlans(clientId: string) {
	return useQuery({
		queryKey: planKeys.listByClient(clientId),
		queryFn: () => getPlansByClient(clientId),
		enabled: !!clientId,
	})
}

/**
 * Hook do pobierania planów trenera
 */
export function useTrainerPlans(trainerId: string) {
	return useQuery({
		queryKey: planKeys.listByTrainer(trainerId),
		queryFn: () => getPlansByTrainer(trainerId),
		enabled: !!trainerId,
	})
}

/**
 * Hook do pobierania aktywnego planu klienta
 */
export function useActivePlan(clientId: string) {
	return useQuery({
		queryKey: ['active-plan', clientId],
		queryFn: () => getActivePlanForClient(clientId),
		enabled: !!clientId,
	})
}

/**
 * Hook do pobierania szczegółów planu
 */
export function usePlanDetails(planId: string) {
	return useQuery({
		queryKey: planKeys.detail(planId),
		queryFn: () => getPlanDetails(planId),
		enabled: !!planId,
	})
}

/**
 * Hook do tworzenia planu
 */
export function useCreatePlan() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ trainerId, input }: { trainerId: string; input: CreatePlanInput }) =>
			createPlan(trainerId, input),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: planKeys.listByClient(variables.input.client_id) })
			queryClient.invalidateQueries({ queryKey: planKeys.lists() })
		},
	})
}

/**
 * Hook do aktualizacji planu
 */
export function useUpdatePlan() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ planId, input }: { planId: string; input: UpdatePlanInput }) =>
			updatePlan(planId, input),
		onSuccess: (updatedPlan) => {
			queryClient.setQueryData(planKeys.detail(updatedPlan.id), (old: TrainingPlanWithDetails | undefined) => {
				if (!old) return old
				return { ...old, ...updatedPlan }
			})
			queryClient.invalidateQueries({ queryKey: planKeys.lists() })
		},
	})
}

/**
 * Hook do usuwania planu
 */
export function useDeletePlan() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (planId: string) => deletePlan(planId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: planKeys.all })
		},
	})
}

/**
 * Hook do duplikowania planu
 */
export function useDuplicatePlan() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (planId: string) => duplicatePlanToNextWeek(planId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: planKeys.all })
		},
	})
}

/**
 * Hook do dodawania dnia treningowego
 */
export function useAddWorkoutDay() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: CreateWorkoutDayInput) => addWorkoutDay(input),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: planKeys.detail(variables.plan_id) })
		},
	})
}

/**
 * Hook do aktualizacji dnia treningowego
 */
export function useUpdateWorkoutDay() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ dayId, input }: { dayId: string; input: UpdateWorkoutDayInput }) =>
			updateWorkoutDay(dayId, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: planKeys.all })
		},
	})
}

/**
 * Hook do usuwania dnia treningowego
 */
export function useDeleteWorkoutDay() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (dayId: string) => deleteWorkoutDay(dayId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: planKeys.all })
		},
	})
}

/**
 * Hook do dodawania ćwiczenia do dnia
 */
export function useAddExerciseToWorkout() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: AddExerciseToWorkoutInput) => addExerciseToWorkout(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: planKeys.all })
		},
	})
}

/**
 * Hook do aktualizacji ćwiczenia w dniu
 */
export function useUpdateWorkoutExercise() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({
			workoutExerciseId,
			input,
		}: {
			workoutExerciseId: string
			input: UpdateWorkoutExerciseInput
		}) => updateWorkoutExercise(workoutExerciseId, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: planKeys.all })
		},
	})
}

/**
 * Hook do usuwania ćwiczenia z dnia
 */
export function useRemoveExerciseFromWorkout() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (workoutExerciseId: string) => removeExerciseFromWorkout(workoutExerciseId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: planKeys.all })
		},
	})
}

// ============================================
// EKSPORT
// ============================================

export default {
	getPlansByClient,
	getPlansByTrainer,
	getActivePlanForClient,
	getPlanDetails,
	createPlan,
	updatePlan,
	deletePlan,
	duplicatePlanToNextWeek,
	addWorkoutDay,
	updateWorkoutDay,
	deleteWorkoutDay,
	addExerciseToWorkout,
	updateWorkoutExercise,
	removeExerciseFromWorkout,
	reorderWorkoutExercises,
	getWeekDates,
	DAY_NAMES,
}
