/**
 * Cache Manager - Zarządzanie cache'em danych offline
 * 
 * Zapisuje i odczytuje dane z lokalnego storage.
 */

import { 
	STORAGE_KEYS, 
	getObject, 
	setObject, 
	setLastSync, 
	isCacheStale,
	removeKey 
} from './storage'
import { getNetworkStatus } from './networkStatus'
import type { Measurement } from '../../api/services/measurements'

// ============================================
// TYPY
// ============================================

export interface CachedTrainingPlan {
	id: string
	client_id: string
	trainer_id: string
	week_start: string
	week_end: string
	trainer_notes?: string
	is_active: boolean
	workout_days: CachedWorkoutDay[]
}

export interface CachedWorkoutDay {
	id: string
	plan_id: string
	day_of_week: number
	name?: string
	is_rest_day: boolean
	order_index: number
	exercises: CachedWorkoutExercise[]
}

export interface CachedWorkoutExercise {
	id: string
	workout_day_id: string
	exercise_id: string
	sets: number
	reps: string
	weight_kg?: number
	rest_seconds: number
	notes?: string
	order_index: number
	exercise: CachedExercise
}

export interface CachedExercise {
	id: string
	trainer_id: string
	name: string
	category: string
	muscle_groups: string[]
	difficulty: string
	description?: string
	tips?: string
	video_url?: string
	thumbnail_url?: string
}

export interface CachedCompletedWorkout {
	id: string
	user_id: string
	workout_day_id: string
	completed_date: string
	status: 'completed' | 'partial' | 'skipped'
	duration_minutes?: number
	client_notes?: string
	feeling_rating?: number
	exercises: CachedCompletedExercise[]
}

export interface CachedCompletedExercise {
	workout_exercise_id: string
	is_completed: boolean
	actual_sets?: number
	actual_reps?: string
	actual_weight_kg?: number
	notes?: string
}

export interface CachedClient {
	id: string
	user_id: string
	email: string
	first_name: string
	last_name: string
	avatar_url?: string
	is_active: boolean
}

export interface UserProfile {
	id: string
	user_id: string
	email: string
	first_name: string
	last_name: string
	role: 'client' | 'trainer' | 'admin'
	trainer_id?: string
	avatar_url?: string
}

// ============================================
// CACHE FUNCTIONS
// ============================================

// --- PROFILE ---

export function cacheProfile(profile: UserProfile): void {
	setObject(STORAGE_KEYS.PROFILE, profile)
	setLastSync(STORAGE_KEYS.PROFILE)
}

export function getCachedProfile(): UserProfile | null {
	return getObject<UserProfile>(STORAGE_KEYS.PROFILE)
}

// --- TRAINING PLANS ---

export function cacheTrainingPlans(userId: string, plans: CachedTrainingPlan[]): void {
	const key = `${STORAGE_KEYS.TRAINING_PLANS}:${userId}`
	setObject(key, plans)
	setLastSync(key)
}

export function getCachedTrainingPlans(userId: string): CachedTrainingPlan[] | null {
	const key = `${STORAGE_KEYS.TRAINING_PLANS}:${userId}`
	return getObject<CachedTrainingPlan[]>(key)
}

export function isTrainingPlansCacheStale(userId: string): boolean {
	const key = `${STORAGE_KEYS.TRAINING_PLANS}:${userId}`
	return isCacheStale(key, 30 * 60 * 1000) // 30 minut
}

// --- EXERCISES ---

export function cacheExercises(trainerId: string, exercises: CachedExercise[]): void {
	const key = `${STORAGE_KEYS.EXERCISES}:${trainerId}`
	setObject(key, exercises)
	setLastSync(key)
}

export function getCachedExercises(trainerId: string): CachedExercise[] | null {
	const key = `${STORAGE_KEYS.EXERCISES}:${trainerId}`
	return getObject<CachedExercise[]>(key)
}

export function isExercisesCacheStale(trainerId: string): boolean {
	const key = `${STORAGE_KEYS.EXERCISES}:${trainerId}`
	return isCacheStale(key, 60 * 60 * 1000) // 1 godzina
}

// --- MEASUREMENTS ---

export function cacheMeasurements(userId: string, measurements: Measurement[]): void {
	const key = `${STORAGE_KEYS.MEASUREMENTS}:${userId}`
	setObject(key, measurements)
	setLastSync(key)
}

export function getCachedMeasurements(userId: string): Measurement[] | null {
	const key = `${STORAGE_KEYS.MEASUREMENTS}:${userId}`
	return getObject<Measurement[]>(key)
}

export function addCachedMeasurement(userId: string, measurement: Measurement): void {
	const cached = getCachedMeasurements(userId) || []
	cached.unshift(measurement) // Dodaj na początek (najnowsze)
	cacheMeasurements(userId, cached)
}

// --- COMPLETED WORKOUTS ---

export function cacheCompletedWorkouts(userId: string, workouts: CachedCompletedWorkout[]): void {
	const key = `${STORAGE_KEYS.COMPLETED_WORKOUTS}:${userId}`
	setObject(key, workouts)
	setLastSync(key)
}

export function getCachedCompletedWorkouts(userId: string): CachedCompletedWorkout[] | null {
	const key = `${STORAGE_KEYS.COMPLETED_WORKOUTS}:${userId}`
	return getObject<CachedCompletedWorkout[]>(key)
}

export function addCachedCompletedWorkout(userId: string, workout: CachedCompletedWorkout): void {
	const cached = getCachedCompletedWorkouts(userId) || []
	cached.unshift(workout)
	cacheCompletedWorkouts(userId, cached)
}

export function isWorkoutDayCompletedOffline(userId: string, workoutDayId: string): boolean {
	const cached = getCachedCompletedWorkouts(userId)
	if (!cached) return false
	
	const today = new Date().toISOString().split('T')[0]
	return cached.some(w => 
		w.workout_day_id === workoutDayId && 
		w.completed_date === today
	)
}

// --- CLIENTS (dla trenera) ---

export function cacheClients(trainerId: string, clients: CachedClient[]): void {
	const key = `${STORAGE_KEYS.CLIENT_LIST}:${trainerId}`
	setObject(key, clients)
	setLastSync(key)
}

export function getCachedClients(trainerId: string): CachedClient[] | null {
	const key = `${STORAGE_KEYS.CLIENT_LIST}:${trainerId}`
	return getObject<CachedClient[]>(key)
}

// --- CLEAR CACHE ---

export function clearUserCache(userId: string): void {
	removeKey(`${STORAGE_KEYS.TRAINING_PLANS}:${userId}`)
	removeKey(`${STORAGE_KEYS.MEASUREMENTS}:${userId}`)
	removeKey(`${STORAGE_KEYS.COMPLETED_WORKOUTS}:${userId}`)
	removeKey(`${STORAGE_KEYS.EXERCISES}:${userId}`)
	removeKey(`${STORAGE_KEYS.CLIENT_LIST}:${userId}`)
	removeKey(STORAGE_KEYS.PROFILE)
}

