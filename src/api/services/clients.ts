/**
 * Serwis zarządzania klientami FitCoach
 *
 * Obsługuje operacje trenera związane z klientami:
 * - Lista klientów trenera
 * - Szczegóły klienta z pomiarami i postępami
 * - Przypisywanie/odłączanie klientów
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '../supabase'
import type {
	Profile,
	ClientData,
	Measurement,
	TrainingPlan,
	CompletedWorkout,
} from '../../types'

// ============================================
// TYPY
// ============================================

/**
 * Klient z dodatkowymi danymi
 */
export interface ClientWithData extends Profile {
	client_data: ClientData | null
}

/**
 * Klient ze statystykami (dla listy trenera)
 */
export interface ClientWithStats extends ClientWithData {
	/** Liczba ukończonych treningów */
	completed_workouts_count: number
	/** Liczba planów treningowych */
	training_plans_count: number
	/** Ostatni trening */
	last_workout_date: string | null
	/** Aktywny plan */
	active_plan: TrainingPlan | null
}

/**
 * Pełne dane klienta (dla widoku szczegółów)
 */
export interface ClientFullDetails extends ClientWithData {
	/** Historia pomiarów */
	measurements: Measurement[]
	/** Aktywny plan treningowy */
	active_plan: TrainingPlan | null
	/** Ostatnie treningi */
	recent_workouts: CompletedWorkout[]
	/** Statystyki */
	stats: {
		total_workouts: number
		workouts_this_week: number
		workouts_this_month: number
		streak_days: number
	}
}

/**
 * Status treningu klienta na dziś
 */
export type TodayWorkoutStatus = 'completed' | 'in_progress' | 'not_started' | 'rest_day' | 'no_plan'

/**
 * Klient z dzisiejszym statusem (dla Dashboard trenera)
 */
export interface ClientTodayStatus {
	client: ClientWithData
	status: TodayWorkoutStatus
	workout_name?: string
	completed_at?: string
}

// ============================================
// KLUCZE QUERY
// ============================================

export const clientKeys = {
	all: ['clients'] as const,
	lists: () => [...clientKeys.all, 'list'] as const,
	listByTrainer: (trainerId: string) => [...clientKeys.lists(), 'trainer', trainerId] as const,
	details: () => [...clientKeys.all, 'detail'] as const,
	detail: (clientId: string) => [...clientKeys.details(), clientId] as const,
	todayStatus: (trainerId: string) => [...clientKeys.all, 'today', trainerId] as const,
}

// ============================================
// FUNKCJE API
// ============================================

/**
 * Pobiera listę klientów przypisanych do trenera
 */
export async function getClientsByTrainer(trainerId: string): Promise<ClientWithData[]> {
	const { data, error } = await supabase
		.from('profiles')
		.select(`
			*,
			client_data (*)
		`)
		.eq('trainer_id', trainerId)
		.eq('role', 'client')
		.eq('is_active', true)
		.order('last_name', { ascending: true })

	if (error) throw handleSupabaseError(error)
	return data as ClientWithData[]
}

/**
 * Pobiera klientów ze statystykami
 */
export async function getClientsWithStats(trainerId: string): Promise<ClientWithStats[]> {
	// Pobierz podstawowe dane klientów
	const clients = await getClientsByTrainer(trainerId)
	
	// Dla każdego klienta pobierz statystyki
	const clientsWithStats: ClientWithStats[] = await Promise.all(
		clients.map(async (client) => {
			// Liczba ukończonych treningów
			const { count: workoutsCount } = await supabase
				.from('completed_workouts')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', client.user_id)

			// Liczba planów treningowych
			const { count: plansCount } = await supabase
				.from('training_plans')
				.select('*', { count: 'exact', head: true })
				.eq('client_id', client.id)

			// Ostatni trening
			const { data: lastWorkout } = await supabase
				.from('completed_workouts')
				.select('completed_date')
				.eq('user_id', client.user_id)
				.order('completed_date', { ascending: false })
				.limit(1)
				.single()

			// Aktywny plan
			const { data: activePlan } = await supabase
				.from('training_plans')
				.select('*')
				.eq('client_id', client.id)
				.eq('is_active', true)
				.single()

			return {
				...client,
				completed_workouts_count: workoutsCount || 0,
				training_plans_count: plansCount || 0,
				last_workout_date: lastWorkout?.completed_date || null,
				active_plan: activePlan || null,
			}
		})
	)

	return clientsWithStats
}

/**
 * Pobiera szczegóły klienta z pomiarami i statystykami
 */
export async function getClientDetails(clientId: string): Promise<ClientFullDetails | null> {
	// Pobierz profil i dane klienta
	const { data: profile, error } = await supabase
		.from('profiles')
		.select(`
			*,
			client_data (*)
		`)
		.eq('id', clientId)
		.single()

	if (error) {
		if (error.code === 'PGRST116') return null
		throw handleSupabaseError(error)
	}

	const clientWithData = profile as ClientWithData

	// Pobierz pomiary (ostatnie 10)
	const { data: measurements } = await supabase
		.from('measurements')
		.select('*')
		.eq('user_id', clientWithData.user_id)
		.order('measurement_date', { ascending: false })
		.limit(10)

	// Pobierz aktywny plan
	const { data: activePlan } = await supabase
		.from('training_plans')
		.select('*')
		.eq('client_id', clientId)
		.eq('is_active', true)
		.single()

	// Pobierz ostatnie treningi (5)
	const { data: recentWorkouts } = await supabase
		.from('completed_workouts')
		.select('*')
		.eq('user_id', clientWithData.user_id)
		.order('completed_date', { ascending: false })
		.limit(5)

	// Oblicz statystyki
	const now = new Date()
	const startOfWeek = new Date(now)
	startOfWeek.setDate(now.getDate() - now.getDay() + 1)
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

	const { count: totalWorkouts } = await supabase
		.from('completed_workouts')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', clientWithData.user_id)

	const { count: workoutsThisWeek } = await supabase
		.from('completed_workouts')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', clientWithData.user_id)
		.gte('completed_date', startOfWeek.toISOString().split('T')[0])

	const { count: workoutsThisMonth } = await supabase
		.from('completed_workouts')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', clientWithData.user_id)
		.gte('completed_date', startOfMonth.toISOString().split('T')[0])

	// Oblicz streak (uproszczona wersja)
	let streakDays = 0
	if (recentWorkouts && recentWorkouts.length > 0) {
		const today = new Date().toISOString().split('T')[0]
		const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
		const lastWorkoutDate = recentWorkouts[0].completed_date

		if (lastWorkoutDate === today || lastWorkoutDate === yesterday) {
			streakDays = 1
			// Prosta logika streak - można rozbudować
			for (let i = 1; i < recentWorkouts.length; i++) {
				const prevDate = new Date(recentWorkouts[i - 1].completed_date)
				const currDate = new Date(recentWorkouts[i].completed_date)
				const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000)
				if (diffDays <= 2) {
					streakDays++
				} else {
					break
				}
			}
		}
	}

	return {
		...clientWithData,
		measurements: (measurements || []) as Measurement[],
		active_plan: activePlan || null,
		recent_workouts: (recentWorkouts || []) as CompletedWorkout[],
		stats: {
			total_workouts: totalWorkouts || 0,
			workouts_this_week: workoutsThisWeek || 0,
			workouts_this_month: workoutsThisMonth || 0,
			streak_days: streakDays,
		},
	}
}

/**
 * Pobiera status dzisiejszego treningu dla wszystkich klientów trenera
 */
export async function getClientsTodayStatus(trainerId: string): Promise<ClientTodayStatus[]> {
	const clients = await getClientsByTrainer(trainerId)
	const today = new Date().toISOString().split('T')[0]
	const dayOfWeek = (new Date().getDay() + 6) % 7 // 0 = poniedziałek

	const statuses: ClientTodayStatus[] = await Promise.all(
		clients.map(async (client) => {
			// Sprawdź czy ma aktywny plan
			const { data: activePlan } = await supabase
				.from('training_plans')
				.select(`
					*,
					workout_days (*)
				`)
				.eq('client_id', client.id)
				.eq('is_active', true)
				.single()

			if (!activePlan) {
				return { client, status: 'no_plan' as TodayWorkoutStatus }
			}

			// Znajdź dzisiejszy dzień treningowy
			const todayWorkout = activePlan.workout_days?.find(
				(day: any) => day.day_of_week === dayOfWeek
			)

			if (!todayWorkout) {
				return { client, status: 'no_plan' as TodayWorkoutStatus }
			}

			if (todayWorkout.is_rest_day) {
				return {
					client,
					status: 'rest_day' as TodayWorkoutStatus,
					workout_name: 'Dzień odpoczynku',
				}
			}

			// Sprawdź czy ukończył trening
			const { data: completedWorkout } = await supabase
				.from('completed_workouts')
				.select('*')
				.eq('user_id', client.user_id)
				.eq('workout_day_id', todayWorkout.id)
				.eq('completed_date', today)
				.single()

			if (completedWorkout) {
				return {
					client,
					status: 'completed' as TodayWorkoutStatus,
					workout_name: todayWorkout.name || `Dzień ${dayOfWeek + 1}`,
					completed_at: completedWorkout.created_at,
				}
			}

			return {
				client,
				status: 'not_started' as TodayWorkoutStatus,
				workout_name: todayWorkout.name || `Dzień ${dayOfWeek + 1}`,
			}
		})
	)

	// Sortuj: najpierw ukończone, potem nierozpoczęte, potem reszta
	return statuses.sort((a, b) => {
		const order = { completed: 0, in_progress: 1, not_started: 2, rest_day: 3, no_plan: 4 }
		return order[a.status] - order[b.status]
	})
}

/**
 * Przypisuje klienta do trenera
 */
export async function assignClientToTrainer(
	clientId: string,
	trainerId: string
): Promise<Profile> {
	const { data, error } = await supabase
		.from('profiles')
		.update({ trainer_id: trainerId })
		.eq('id', clientId)
		.eq('role', 'client')
		.select()
		.single()

	if (error) throw handleSupabaseError(error)
	return data as Profile
}

/**
 * Odłącza klienta od trenera
 */
export async function unassignClient(clientId: string): Promise<Profile> {
	const { data, error } = await supabase
		.from('profiles')
		.update({ trainer_id: null })
		.eq('id', clientId)
		.select()
		.single()

	if (error) throw handleSupabaseError(error)
	return data as Profile
}

/**
 * Wyszukuje klientów bez trenera (do przypisania)
 */
export async function searchUnassignedClients(query: string): Promise<Profile[]> {
	const { data, error } = await supabase
		.from('profiles')
		.select('*')
		.eq('role', 'client')
		.is('trainer_id', null)
		.eq('is_active', true)
		.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
		.limit(10)

	if (error) throw handleSupabaseError(error)
	return data as Profile[]
}

/**
 * Aktualizuje dane klienta (przez trenera)
 */
export async function updateClientData(
	clientId: string,
	data: Partial<ClientData>
): Promise<ClientData> {
	// Znajdź user_id dla tego profilu
	const { data: profile } = await supabase
		.from('profiles')
		.select('user_id')
		.eq('id', clientId)
		.single()

	if (!profile) throw new Error('Nie znaleziono klienta')

	const { data: updated, error } = await supabase
		.from('client_data')
		.update(data)
		.eq('user_id', profile.user_id)
		.select()
		.single()

	if (error) throw handleSupabaseError(error)
	return updated as ClientData
}

// ============================================
// REACT QUERY HOOKS
// ============================================

/**
 * Hook do pobierania listy klientów trenera
 */
export function useTrainerClients(trainerId: string) {
	return useQuery({
		queryKey: clientKeys.listByTrainer(trainerId),
		queryFn: () => getClientsByTrainer(trainerId),
		enabled: !!trainerId,
	})
}

/**
 * Hook do pobierania klientów ze statystykami
 */
export function useClientsWithStats(trainerId: string) {
	return useQuery({
		queryKey: [...clientKeys.listByTrainer(trainerId), 'stats'],
		queryFn: () => getClientsWithStats(trainerId),
		enabled: !!trainerId,
	})
}

/**
 * Hook do pobierania szczegółów klienta
 */
export function useClientDetails(clientId: string) {
	return useQuery({
		queryKey: clientKeys.detail(clientId),
		queryFn: () => getClientDetails(clientId),
		enabled: !!clientId,
	})
}

/**
 * Hook do pobierania statusu klientów na dziś
 */
export function useClientsTodayStatus(trainerId: string) {
	return useQuery({
		queryKey: clientKeys.todayStatus(trainerId),
		queryFn: () => getClientsTodayStatus(trainerId),
		enabled: !!trainerId,
		refetchInterval: 60000, // Odświeżaj co minutę
	})
}

/**
 * Hook do przypisywania klienta
 */
export function useAssignClient() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ clientId, trainerId }: { clientId: string; trainerId: string }) =>
			assignClientToTrainer(clientId, trainerId),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: clientKeys.listByTrainer(variables.trainerId) })
		},
	})
}

/**
 * Hook do odłączania klienta
 */
export function useUnassignClient() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (clientId: string) => unassignClient(clientId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: clientKeys.all })
		},
	})
}

/**
 * Hook do wyszukiwania nieprzypisanych klientów
 */
export function useSearchUnassignedClients(query: string) {
	return useQuery({
		queryKey: ['unassigned-clients', query],
		queryFn: () => searchUnassignedClients(query),
		enabled: query.length >= 2,
	})
}

/**
 * Hook do aktualizacji danych klienta
 */
export function useUpdateClientData() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ clientId, data }: { clientId: string; data: Partial<ClientData> }) =>
			updateClientData(clientId, data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: clientKeys.detail(variables.clientId) })
		},
	})
}

// ============================================
// EKSPORT
// ============================================

export default {
	getClientsByTrainer,
	getClientsWithStats,
	getClientDetails,
	getClientsTodayStatus,
	assignClientToTrainer,
	unassignClient,
	searchUnassignedClients,
	updateClientData,
}

