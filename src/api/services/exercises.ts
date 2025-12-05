/**
 * Serwis ćwiczeń FitCoach
 *
 * Obsługuje CRUD ćwiczeń z biblioteki trenera.
 * Wykorzystuje React Query do cache'owania i synchronizacji.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '../supabase'
import type {
	Exercise,
	ExerciseFormData,
	ExerciseFilters,
	ExerciseCategory,
	ExerciseDifficulty,
	MuscleGroup,
} from '../../types'

// ============================================
// TYPY
// ============================================

/**
 * Dane do tworzenia ćwiczenia
 */
export interface CreateExerciseInput {
	name: string
	category: ExerciseCategory
	muscle_groups: MuscleGroup[]
	difficulty: ExerciseDifficulty
	description?: string
	tips?: string
	typical_reps?: string
	rest_seconds?: number
	video_url?: string
	thumbnail_url?: string
}

/**
 * Dane do aktualizacji ćwiczenia
 */
export interface UpdateExerciseInput extends Partial<CreateExerciseInput> {}

// ============================================
// KLUCZE QUERY
// ============================================

export const exerciseKeys = {
	all: ['exercises'] as const,
	lists: () => [...exerciseKeys.all, 'list'] as const,
	list: (filters?: ExerciseFilters) => [...exerciseKeys.lists(), filters] as const,
	details: () => [...exerciseKeys.all, 'detail'] as const,
	detail: (id: string) => [...exerciseKeys.details(), id] as const,
}

// ============================================
// FUNKCJE API
// ============================================

/**
 * Pobiera listę ćwiczeń z opcjonalnymi filtrami
 */
export async function getExercises(filters?: ExerciseFilters): Promise<Exercise[]> {
	let query = supabase
		.from('exercises')
		.select('*')
		.eq('is_active', true)
		.order('name', { ascending: true })

	// Filtr po nazwie (search)
	if (filters?.search) {
		query = query.ilike('name', `%${filters.search}%`)
	}

	// Filtr po kategorii
	if (filters?.category) {
		query = query.eq('category', filters.category)
	}

	// Filtr po trudności
	if (filters?.difficulty) {
		query = query.eq('difficulty', filters.difficulty)
	}

	// Filtr po grupie mięśniowej
	if (filters?.muscle_group) {
		query = query.contains('muscle_groups', [filters.muscle_group])
	}

	const { data, error } = await query

	if (error) {
		throw handleSupabaseError(error)
	}

	return data as Exercise[]
}

/**
 * Pobiera pojedyncze ćwiczenie po ID
 */
export async function getExerciseById(id: string): Promise<Exercise | null> {
	const { data, error } = await supabase
		.from('exercises')
		.select('*')
		.eq('id', id)
		.single()

	if (error) {
		if (error.code === 'PGRST116') {
			return null // Nie znaleziono
		}
		throw handleSupabaseError(error)
	}

	return data as Exercise
}

/**
 * Tworzy nowe ćwiczenie
 */
export async function createExercise(
	trainerId: string,
	data: CreateExerciseInput
): Promise<Exercise> {
	const { data: exercise, error } = await supabase
		.from('exercises')
		.insert({
			trainer_id: trainerId,
			...data,
		})
		.select()
		.single()

	if (error) {
		throw handleSupabaseError(error)
	}

	return exercise as Exercise
}

/**
 * Aktualizuje ćwiczenie
 */
export async function updateExercise(
	id: string,
	data: UpdateExerciseInput
): Promise<Exercise> {
	const { data: exercise, error } = await supabase
		.from('exercises')
		.update(data)
		.eq('id', id)
		.select()
		.single()

	if (error) {
		throw handleSupabaseError(error)
	}

	return exercise as Exercise
}

/**
 * Usuwa ćwiczenie (soft delete - ustawia is_active = false)
 */
export async function deleteExercise(id: string): Promise<void> {
	// Najpierw sprawdź czy ćwiczenie jest używane w planach
	const isUsed = await checkIfExerciseUsedInPlans(id)

	if (isUsed) {
		throw {
			message: 'Nie można usunąć ćwiczenia, które jest używane w planach treningowych.',
			isAuthError: false,
			isNetworkError: false,
			originalError: new Error('Exercise is in use'),
		}
	}

	const { error } = await supabase
		.from('exercises')
		.update({ is_active: false })
		.eq('id', id)

	if (error) {
		throw handleSupabaseError(error)
	}
}

/**
 * Sprawdza czy ćwiczenie jest używane w jakichkolwiek planach treningowych
 */
export async function checkIfExerciseUsedInPlans(exerciseId: string): Promise<boolean> {
	const { count, error } = await supabase
		.from('workout_exercises')
		.select('*', { count: 'exact', head: true })
		.eq('exercise_id', exerciseId)

	if (error) {
		console.error('Błąd sprawdzania użycia ćwiczenia:', error)
		return false
	}

	return (count ?? 0) > 0
}

/**
 * Trwale usuwa ćwiczenie (tylko jeśli nie jest używane)
 */
export async function permanentlyDeleteExercise(id: string): Promise<void> {
	const isUsed = await checkIfExerciseUsedInPlans(id)

	if (isUsed) {
		throw {
			message: 'Nie można trwale usunąć ćwiczenia, które jest używane w planach.',
			isAuthError: false,
			isNetworkError: false,
			originalError: new Error('Exercise is in use'),
		}
	}

	const { error } = await supabase
		.from('exercises')
		.delete()
		.eq('id', id)

	if (error) {
		throw handleSupabaseError(error)
	}
}

// ============================================
// REACT QUERY HOOKS
// ============================================

/**
 * Hook do pobierania listy ćwiczeń
 *
 * @example
 * const { data: exercises, isLoading } = useExercises({ category: 'strength' });
 */
export function useExercises(filters?: ExerciseFilters) {
	return useQuery({
		queryKey: exerciseKeys.list(filters),
		queryFn: () => getExercises(filters),
	})
}

/**
 * Hook do pobierania pojedynczego ćwiczenia
 *
 * @example
 * const { data: exercise } = useExercise('exercise-id-123');
 */
export function useExercise(id: string) {
	return useQuery({
		queryKey: exerciseKeys.detail(id),
		queryFn: () => getExerciseById(id),
		enabled: !!id,
	})
}

/**
 * Hook do tworzenia ćwiczenia
 *
 * @example
 * const createMutation = useCreateExercise();
 * createMutation.mutate({ trainerId: '...', data: {...} });
 */
export function useCreateExercise() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ trainerId, data }: { trainerId: string; data: CreateExerciseInput }) =>
			createExercise(trainerId, data),
		onSuccess: () => {
			// Odśwież listę ćwiczeń
			queryClient.invalidateQueries({ queryKey: exerciseKeys.lists() })
		},
	})
}

/**
 * Hook do aktualizacji ćwiczenia
 *
 * @example
 * const updateMutation = useUpdateExercise();
 * updateMutation.mutate({ id: 'exercise-id', data: { name: 'Nowa nazwa' } });
 */
export function useUpdateExercise() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateExerciseInput }) =>
			updateExercise(id, data),
		onSuccess: (updatedExercise) => {
			// Zaktualizuj cache dla tego ćwiczenia
			queryClient.setQueryData(
				exerciseKeys.detail(updatedExercise.id),
				updatedExercise
			)
			// Odśwież listę
			queryClient.invalidateQueries({ queryKey: exerciseKeys.lists() })
		},
	})
}

/**
 * Hook do usuwania ćwiczenia
 *
 * @example
 * const deleteMutation = useDeleteExercise();
 * deleteMutation.mutate('exercise-id');
 */
export function useDeleteExercise() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => deleteExercise(id),
		onSuccess: (_, deletedId) => {
			// Usuń z cache
			queryClient.removeQueries({ queryKey: exerciseKeys.detail(deletedId) })
			// Odśwież listę
			queryClient.invalidateQueries({ queryKey: exerciseKeys.lists() })
		},
	})
}

/**
 * Hook do sprawdzania czy ćwiczenie jest używane
 */
export function useCheckExerciseUsage(exerciseId: string) {
	return useQuery({
		queryKey: ['exerciseUsage', exerciseId],
		queryFn: () => checkIfExerciseUsedInPlans(exerciseId),
		enabled: !!exerciseId,
	})
}

// ============================================
// EKSPORT
// ============================================

export default {
	getExercises,
	getExerciseById,
	createExercise,
	updateExercise,
	deleteExercise,
	checkIfExerciseUsedInPlans,
	permanentlyDeleteExercise,
}

