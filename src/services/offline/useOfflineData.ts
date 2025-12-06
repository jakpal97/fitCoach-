/**
 * useOfflineData - Hooki React do danych offline
 * 
 * Zapewniają dostęp do danych zarówno online jak i offline.
 */

import { useEffect, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useNetworkStatus, getNetworkStatus } from './networkStatus'
import { offlineQueue } from './offlineQueue'
import {
	cacheTrainingPlans,
	getCachedTrainingPlans,
	isTrainingPlansCacheStale,
	cacheMeasurements,
	getCachedMeasurements,
	addCachedMeasurement,
	cacheCompletedWorkouts,
	getCachedCompletedWorkouts,
	addCachedCompletedWorkout,
	cacheExercises,
	getCachedExercises,
	isExercisesCacheStale,
	isWorkoutDayCompletedOffline,
	type CachedTrainingPlan,
	type CachedCompletedWorkout,
	type CachedExercise,
} from './cacheManager'
import type { SaveWorkoutData, SaveMeasurementData } from './offlineSync'
import { 
	getActivePlanForClient, 
	getPlanDetails,
	getCompletedWorkouts,
	getWorkoutStats,
	type TrainingPlanWithDetails,
	type CompletedWorkout,
	type WorkoutStats,
} from '../../api/services/trainingPlans'
import { getMeasurements, type Measurement } from '../../api/services/measurements'
import { getTrainerExercises, type Exercise } from '../../api/services/exercises'

// ============================================
// HOOK: AKTYWNY PLAN Z CACHE
// ============================================

export function useOfflineActivePlan(clientId: string) {
	const { isOnline } = useNetworkStatus()
	const queryClient = useQueryClient()
	
	const query = useQuery({
		queryKey: ['offline-active-plan', clientId],
		queryFn: async (): Promise<TrainingPlanWithDetails | null> => {
			// Próbuj pobrać z serwera
			if (isOnline) {
				try {
					const plan = await getActivePlanForClient(clientId)
					
					// Zapisz do cache
					if (plan) {
						cacheTrainingPlans(clientId, [plan as unknown as CachedTrainingPlan])
					}
					
					return plan
				} catch (error) {
					console.warn('[OfflineData] Błąd pobierania planu, używam cache:', error)
				}
			}
			
			// Fallback do cache
			const cached = getCachedTrainingPlans(clientId)
			if (cached && cached.length > 0) {
				return cached[0] as unknown as TrainingPlanWithDetails
			}
			
			return null
		},
		enabled: !!clientId,
		staleTime: 5 * 60 * 1000, // 5 minut
	})
	
	// Zwróć z cache jeśli query się ładuje
	const cachedData = useMemo(() => {
		if (query.isLoading && !query.data) {
			const cached = getCachedTrainingPlans(clientId)
			return cached?.[0] as unknown as TrainingPlanWithDetails || null
		}
		return query.data
	}, [query.isLoading, query.data, clientId])
	
	return {
		...query,
		data: cachedData,
		isFromCache: !isOnline || query.isLoading,
	}
}

// ============================================
// HOOK: SZCZEGÓŁY PLANU Z CACHE
// ============================================

export function useOfflinePlanDetails(planId: string, clientId?: string) {
	const { isOnline } = useNetworkStatus()
	
	const query = useQuery({
		queryKey: ['offline-plan-details', planId],
		queryFn: async (): Promise<TrainingPlanWithDetails | null> => {
			if (isOnline) {
				try {
					const plan = await getPlanDetails(planId)
					
					// Zapisz do cache
					if (plan && clientId) {
						const existing = getCachedTrainingPlans(clientId) || []
						const updated = existing.filter(p => p.id !== planId)
						updated.unshift(plan as unknown as CachedTrainingPlan)
						cacheTrainingPlans(clientId, updated)
					}
					
					return plan
				} catch (error) {
					console.warn('[OfflineData] Błąd pobierania szczegółów planu:', error)
				}
			}
			
			// Fallback do cache
			if (clientId) {
				const cached = getCachedTrainingPlans(clientId)
				const plan = cached?.find(p => p.id === planId)
				if (plan) {
					return plan as unknown as TrainingPlanWithDetails
				}
			}
			
			return null
		},
		enabled: !!planId,
	})
	
	return {
		...query,
		isFromCache: !isOnline,
	}
}

// ============================================
// HOOK: UKOŃCZONE TRENINGI Z CACHE
// ============================================

export function useOfflineCompletedWorkouts(userId: string) {
	const { isOnline } = useNetworkStatus()
	
	const query = useQuery({
		queryKey: ['offline-completed-workouts', userId],
		queryFn: async (): Promise<CompletedWorkout[]> => {
			if (isOnline) {
				try {
					const workouts = await getCompletedWorkouts(userId)
					cacheCompletedWorkouts(userId, workouts as unknown as CachedCompletedWorkout[])
					return workouts
				} catch (error) {
					console.warn('[OfflineData] Błąd pobierania ukończonych treningów:', error)
				}
			}
			
			const cached = getCachedCompletedWorkouts(userId)
			return (cached || []) as unknown as CompletedWorkout[]
		},
		enabled: !!userId,
	})
	
	return {
		...query,
		isFromCache: !isOnline,
	}
}

// ============================================
// HOOK: STATYSTYKI Z CACHE
// ============================================

export function useOfflineWorkoutStats(userId: string) {
	const { isOnline } = useNetworkStatus()
	
	return useQuery({
		queryKey: ['offline-workout-stats', userId],
		queryFn: async (): Promise<WorkoutStats> => {
			if (isOnline) {
				try {
					return await getWorkoutStats(userId)
				} catch (error) {
					console.warn('[OfflineData] Błąd pobierania statystyk:', error)
				}
			}
			
			// Oblicz statystyki z cache
			const cached = getCachedCompletedWorkouts(userId) || []
			const total = cached.length
			
			// Ten tydzień
			const now = new Date()
			const startOfWeek = new Date(now)
			const day = startOfWeek.getDay()
			const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
			startOfWeek.setDate(diff)
			startOfWeek.setHours(0, 0, 0, 0)
			
			const thisWeek = cached.filter(w => 
				new Date(w.completed_date) >= startOfWeek
			).length
			
			return { thisWeek, streak: 0, total }
		},
		enabled: !!userId,
	})
}

// ============================================
// HOOK: STATUS DZISIEJSZEGO TRENINGU
// ============================================

export function useOfflineTodayWorkoutStatus(userId: string, workoutDayId: string | null) {
	const { isOnline } = useNetworkStatus()
	
	return useQuery({
		queryKey: ['offline-today-workout-status', userId, workoutDayId],
		queryFn: async (): Promise<boolean> => {
			if (!workoutDayId) return false
			
			// Najpierw sprawdź local cache (dla offline zapisów)
			const offlineCompleted = isWorkoutDayCompletedOffline(userId, workoutDayId)
			if (offlineCompleted) return true
			
			if (isOnline) {
				try {
					const { isWorkoutDayCompleted } = await import('../../api/services/trainingPlans')
					return await isWorkoutDayCompleted(userId, workoutDayId)
				} catch (error) {
					console.warn('[OfflineData] Błąd sprawdzania statusu treningu:', error)
				}
			}
			
			return false
		},
		enabled: !!userId && !!workoutDayId,
	})
}

// ============================================
// HOOK: POMIARY Z CACHE
// ============================================

export function useOfflineMeasurements(userId: string) {
	const { isOnline } = useNetworkStatus()
	
	const query = useQuery({
		queryKey: ['offline-measurements', userId],
		queryFn: async (): Promise<Measurement[]> => {
			if (isOnline) {
				try {
					const measurements = await getMeasurements(userId)
					cacheMeasurements(userId, measurements)
					return measurements
				} catch (error) {
					console.warn('[OfflineData] Błąd pobierania pomiarów:', error)
				}
			}
			
			return getCachedMeasurements(userId) || []
		},
		enabled: !!userId,
	})
	
	return {
		...query,
		isFromCache: !isOnline,
	}
}

// ============================================
// HOOK: ĆWICZENIA TRENERA Z CACHE
// ============================================

export function useOfflineExercises(trainerId: string) {
	const { isOnline } = useNetworkStatus()
	
	const query = useQuery({
		queryKey: ['offline-exercises', trainerId],
		queryFn: async (): Promise<Exercise[]> => {
			const shouldRefresh = isExercisesCacheStale(trainerId)
			
			if (isOnline && shouldRefresh) {
				try {
					const exercises = await getTrainerExercises(trainerId)
					cacheExercises(trainerId, exercises as unknown as CachedExercise[])
					return exercises
				} catch (error) {
					console.warn('[OfflineData] Błąd pobierania ćwiczeń:', error)
				}
			}
			
			const cached = getCachedExercises(trainerId)
			if (cached) {
				return cached as unknown as Exercise[]
			}
			
			// Jeśli nie ma cache i jest online, pobierz
			if (isOnline) {
				const exercises = await getTrainerExercises(trainerId)
				cacheExercises(trainerId, exercises as unknown as CachedExercise[])
				return exercises
			}
			
			return []
		},
		enabled: !!trainerId,
	})
	
	return {
		...query,
		isFromCache: !isOnline,
	}
}

// ============================================
// HOOK: ZAPIS TRENINGU OFFLINE
// ============================================

export function useOfflineSaveWorkout() {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async ({ 
			userId, 
			data 
		}: { 
			userId: string
			data: SaveWorkoutData 
		}): Promise<string> => {
			const isOnline = getNetworkStatus()
			
			if (isOnline) {
				// Próbuj zapisać bezpośrednio
				const { supabase, handleSupabaseError } = await import('../../api/supabase')
				
				const { data: workout, error } = await supabase
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
				
				if (error) throw handleSupabaseError(error)
				
				// Zapisz ćwiczenia
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
					
					await supabase.from('completed_exercises').insert(exercisesToInsert)
				}
				
				return workout.id
			}
			
			// Offline: dodaj do kolejki i cache
			const tempId = `offline-${Date.now()}`
			
			// Dodaj do lokalnego cache
			const cachedWorkout: CachedCompletedWorkout = {
				id: tempId,
				user_id: userId,
				workout_day_id: data.workout_day_id,
				completed_date: new Date().toISOString().split('T')[0],
				status: data.status,
				duration_minutes: data.duration_minutes,
				client_notes: data.client_notes,
				feeling_rating: data.feeling_rating,
				exercises: data.exercises,
			}
			addCachedCompletedWorkout(userId, cachedWorkout)
			
			// Dodaj do kolejki synchronizacji
			offlineQueue.addToQueue('SAVE_WORKOUT', data, userId)
			
			console.log('[OfflineData] Trening zapisany offline:', tempId)
			return tempId
		},
		onSuccess: (_, { userId }) => {
			queryClient.invalidateQueries({ queryKey: ['offline-completed-workouts', userId] })
			queryClient.invalidateQueries({ queryKey: ['offline-workout-stats', userId] })
			queryClient.invalidateQueries({ queryKey: ['offline-today-workout-status'] })
			queryClient.invalidateQueries({ queryKey: ['workout-stats'] })
			queryClient.invalidateQueries({ queryKey: ['today-workout-status'] })
		},
	})
}

// ============================================
// HOOK: ZAPIS POMIARU OFFLINE
// ============================================

export function useOfflineSaveMeasurement() {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async ({ 
			userId, 
			input 
		}: { 
			userId: string
			input: SaveMeasurementData 
		}): Promise<string> => {
			const isOnline = getNetworkStatus()
			
			if (isOnline) {
				const { addMeasurement } = await import('../../api/services/measurements')
				const measurement = await addMeasurement(userId, input)
				return measurement.id
			}
			
			// Offline: dodaj do kolejki i cache
			const tempId = `offline-${Date.now()}`
			
			const cachedMeasurement: Measurement = {
				id: tempId,
				user_id: userId,
				measurement_date: input.measurement_date,
				created_at: new Date().toISOString(),
				...input,
			}
			addCachedMeasurement(userId, cachedMeasurement)
			
			offlineQueue.addToQueue('SAVE_MEASUREMENT', input, userId)
			
			console.log('[OfflineData] Pomiar zapisany offline:', tempId)
			return tempId
		},
		onSuccess: (_, { userId }) => {
			queryClient.invalidateQueries({ queryKey: ['offline-measurements', userId] })
			queryClient.invalidateQueries({ queryKey: ['measurements'] })
			queryClient.invalidateQueries({ queryKey: ['measurement-stats'] })
		},
	})
}

// ============================================
// HOOK: LICZBA OCZEKUJĄCYCH OPERACJI
// ============================================

export function useOfflinePendingCount() {
	const { isOnline } = useNetworkStatus()
	
	return useQuery({
		queryKey: ['offline-pending-count'],
		queryFn: () => offlineQueue.getPendingCount(),
		refetchInterval: isOnline ? 5000 : false, // Odśwież co 5s gdy online
	})
}

// ============================================
// HOOK: SYNCHRONIZACJA RĘCZNA
// ============================================

export function useOfflineSync() {
	const queryClient = useQueryClient()
	
	const syncAll = useCallback(async () => {
		const result = await offlineQueue.syncAll()
		
		// Odśwież wszystkie dane po synchronizacji
		if (result.success > 0) {
			queryClient.invalidateQueries()
		}
		
		return result
	}, [queryClient])
	
	return { syncAll }
}

