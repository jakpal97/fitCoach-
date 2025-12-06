/**
 * Offline Sync - Handlery synchronizacji offline
 * 
 * Rejestruje handlery dla operacji w kolejce offline.
 */

import { offlineQueue, type QueuedOperation } from './offlineQueue'
import { supabase, handleSupabaseError } from '../../api/supabase'
import type { MeasurementInput } from '../../api/services/measurements'

// ============================================
// TYPY DLA OPERACJI OFFLINE
// ============================================

export interface SaveWorkoutData {
	workout_day_id: string
	status: 'completed' | 'partial'
	duration_minutes: number
	feeling_rating: number
	client_notes?: string
	exercises: SaveWorkoutExercise[]
}

export interface SaveWorkoutExercise {
	workout_exercise_id: string
	is_completed: boolean
	actual_sets?: number
	actual_reps?: string
	actual_weight_kg?: number
	notes?: string
}

export interface SaveMeasurementData extends MeasurementInput {}

// ============================================
// HANDLERY SYNCHRONIZACJI
// ============================================

/**
 * Handler dla zapisania ukończonego treningu
 */
async function handleSaveWorkout(operation: QueuedOperation): Promise<void> {
	const data = operation.data as SaveWorkoutData
	const userId = operation.userId
	
	// Zapisz główny rekord treningu
	const { data: workout, error: workoutError } = await supabase
		.from('completed_workouts')
		.insert({
			user_id: userId,
			workout_day_id: data.workout_day_id,
			status: data.status,
			duration_minutes: data.duration_minutes,
			feeling_rating: data.feeling_rating,
			client_notes: data.client_notes,
		})
		.select()
		.single()
	
	if (workoutError) throw handleSupabaseError(workoutError)
	
	// Zapisz ukończone ćwiczenia
	if (data.exercises && data.exercises.length > 0) {
		const exercisesToInsert = data.exercises.map(ex => ({
			completed_workout_id: workout.id,
			workout_exercise_id: ex.workout_exercise_id,
			is_completed: ex.is_completed,
			actual_sets: ex.actual_sets,
			actual_reps: ex.actual_reps,
			actual_weight_kg: ex.actual_weight_kg,
			notes: ex.notes,
		}))
		
		const { error: exercisesError } = await supabase
			.from('completed_exercises')
			.insert(exercisesToInsert)
		
		if (exercisesError) throw handleSupabaseError(exercisesError)
	}
	
	console.log('[OfflineSync] ✅ Trening zsynchronizowany:', workout.id)
}

/**
 * Handler dla zapisania pomiaru
 */
async function handleSaveMeasurement(operation: QueuedOperation): Promise<void> {
	const data = operation.data as SaveMeasurementData
	const userId = operation.userId
	
	const { error } = await supabase
		.from('measurements')
		.insert({
			user_id: userId,
			...data,
		})
	
	if (error) throw handleSupabaseError(error)
	
	console.log('[OfflineSync] ✅ Pomiar zsynchronizowany')
}

/**
 * Handler dla aktualizacji planu (trener)
 */
async function handleUpdatePlan(operation: QueuedOperation): Promise<void> {
	const { planId, input } = operation.data
	
	const { error } = await supabase
		.from('training_plans')
		.update(input)
		.eq('id', planId)
	
	if (error) throw handleSupabaseError(error)
	
	console.log('[OfflineSync] ✅ Plan zaktualizowany:', planId)
}

/**
 * Handler dla dodania ćwiczenia
 */
async function handleAddExercise(operation: QueuedOperation): Promise<void> {
	const data = operation.data
	
	const { error } = await supabase
		.from('exercises')
		.insert(data)
	
	if (error) throw handleSupabaseError(error)
	
	console.log('[OfflineSync] ✅ Ćwiczenie dodane')
}

/**
 * Handler dla aktualizacji ćwiczenia
 */
async function handleUpdateExercise(operation: QueuedOperation): Promise<void> {
	const { exerciseId, input } = operation.data
	
	const { error } = await supabase
		.from('exercises')
		.update(input)
		.eq('id', exerciseId)
	
	if (error) throw handleSupabaseError(error)
	
	console.log('[OfflineSync] ✅ Ćwiczenie zaktualizowane:', exerciseId)
}

/**
 * Handler dla usunięcia ćwiczenia
 */
async function handleDeleteExercise(operation: QueuedOperation): Promise<void> {
	const { exerciseId } = operation.data
	
	const { error } = await supabase
		.from('exercises')
		.delete()
		.eq('id', exerciseId)
	
	if (error) throw handleSupabaseError(error)
	
	console.log('[OfflineSync] ✅ Ćwiczenie usunięte:', exerciseId)
}

// ============================================
// REJESTRACJA HANDLERÓW
// ============================================

export function registerOfflineHandlers(): void {
	offlineQueue.registerHandler('SAVE_WORKOUT', handleSaveWorkout)
	offlineQueue.registerHandler('SAVE_MEASUREMENT', handleSaveMeasurement)
	offlineQueue.registerHandler('UPDATE_PLAN', handleUpdatePlan)
	offlineQueue.registerHandler('ADD_EXERCISE', handleAddExercise)
	offlineQueue.registerHandler('UPDATE_EXERCISE', handleUpdateExercise)
	offlineQueue.registerHandler('DELETE_EXERCISE', handleDeleteExercise)
	
	console.log('[OfflineSync] Handlery zarejestrowane')
}

