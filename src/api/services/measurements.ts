/**
 * Serwis do zarządzania pomiarami klienta
 *
 * Obsługuje wagę, obwody ciała i inne metryki.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '../supabase'

// ============================================
// TYPY
// ============================================

export interface Measurement {
	id: string
	user_id: string
	measurement_date: string
	weight_kg?: number
	body_fat_percent?: number
	chest_cm?: number
	waist_cm?: number
	hips_cm?: number
	biceps_left_cm?: number
	biceps_right_cm?: number
	thigh_left_cm?: number
	thigh_right_cm?: number
	calf_left_cm?: number
	calf_right_cm?: number
	notes?: string
	created_at: string
}

export interface MeasurementInput {
	measurement_date: string
	weight_kg?: number
	body_fat_percent?: number
	chest_cm?: number
	waist_cm?: number
	hips_cm?: number
	biceps_left_cm?: number
	biceps_right_cm?: number
	thigh_left_cm?: number
	thigh_right_cm?: number
	calf_left_cm?: number
	calf_right_cm?: number
	notes?: string
}

export interface MeasurementStats {
	currentWeight?: number
	startWeight?: number
	weightChange?: number
	currentBodyFat?: number
	startBodyFat?: number
	bodyFatChange?: number
	measurementCount: number
}

// ============================================
// FUNKCJE API
// ============================================

/**
 * Pobierz pomiary użytkownika
 */
export async function getMeasurements(userId: string): Promise<Measurement[]> {
	const { data, error } = await supabase
		.from('measurements')
		.select('*')
		.eq('user_id', userId)
		.order('measurement_date', { ascending: false })

	if (error) throw handleSupabaseError(error)
	return data as Measurement[]
}

/**
 * Pobierz ostatni pomiar
 */
export async function getLatestMeasurement(userId: string): Promise<Measurement | null> {
	const { data, error } = await supabase
		.from('measurements')
		.select('*')
		.eq('user_id', userId)
		.order('measurement_date', { ascending: false })
		.limit(1)
		.maybeSingle()

	if (error) throw handleSupabaseError(error)
	return data as Measurement | null
}

/**
 * Dodaj nowy pomiar
 */
export async function addMeasurement(userId: string, input: MeasurementInput): Promise<Measurement> {
	const { data, error } = await supabase
		.from('measurements')
		.insert({
			user_id: userId,
			...input,
		})
		.select()
		.single()

	if (error) throw handleSupabaseError(error)
	return data as Measurement
}

/**
 * Zaktualizuj pomiar
 */
export async function updateMeasurement(measurementId: string, input: Partial<MeasurementInput>): Promise<Measurement> {
	const { data, error } = await supabase.from('measurements').update(input).eq('id', measurementId).select().single()

	if (error) throw handleSupabaseError(error)
	return data as Measurement
}

/**
 * Usuń pomiar
 */
export async function deleteMeasurement(measurementId: string): Promise<void> {
	const { error } = await supabase.from('measurements').delete().eq('id', measurementId)

	if (error) throw handleSupabaseError(error)
}

/**
 * Oblicz statystyki pomiarów
 */
export async function getMeasurementStats(userId: string): Promise<MeasurementStats> {
	const measurements = await getMeasurements(userId)

	if (measurements.length === 0) {
		return { measurementCount: 0 }
	}

	const latest = measurements[0]
	const oldest = measurements[measurements.length - 1]

	return {
		currentWeight: latest.weight_kg,
		startWeight: oldest.weight_kg,
		weightChange: latest.weight_kg && oldest.weight_kg ? latest.weight_kg - oldest.weight_kg : undefined,
		currentBodyFat: latest.body_fat_percent,
		startBodyFat: oldest.body_fat_percent,
		bodyFatChange:
			latest.body_fat_percent && oldest.body_fat_percent
				? latest.body_fat_percent - oldest.body_fat_percent
				: undefined,
		measurementCount: measurements.length,
	}
}

// ============================================
// REACT QUERY HOOKS
// ============================================

export function useMeasurements(userId: string) {
	return useQuery({
		queryKey: ['measurements', userId],
		queryFn: () => getMeasurements(userId),
		enabled: !!userId,
	})
}

export function useLatestMeasurement(userId: string) {
	return useQuery({
		queryKey: ['latest-measurement', userId],
		queryFn: () => getLatestMeasurement(userId),
		enabled: !!userId,
	})
}

export function useMeasurementStats(userId: string) {
	return useQuery({
		queryKey: ['measurement-stats', userId],
		queryFn: () => getMeasurementStats(userId),
		enabled: !!userId,
	})
}

export function useAddMeasurement() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ userId, input }: { userId: string; input: MeasurementInput }) => addMeasurement(userId, input),
		onSuccess: (_, { userId }) => {
			queryClient.invalidateQueries({ queryKey: ['measurements', userId] })
			queryClient.invalidateQueries({ queryKey: ['latest-measurement', userId] })
			queryClient.invalidateQueries({ queryKey: ['measurement-stats', userId] })
		},
	})
}

export function useUpdateMeasurement() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ measurementId, input }: { measurementId: string; input: Partial<MeasurementInput> }) =>
			updateMeasurement(measurementId, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['measurements'] })
			queryClient.invalidateQueries({ queryKey: ['latest-measurement'] })
			queryClient.invalidateQueries({ queryKey: ['measurement-stats'] })
		},
	})
}

export function useDeleteMeasurement() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (measurementId: string) => deleteMeasurement(measurementId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['measurements'] })
			queryClient.invalidateQueries({ queryKey: ['latest-measurement'] })
			queryClient.invalidateQueries({ queryKey: ['measurement-stats'] })
		},
	})
}
