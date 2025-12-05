/**
 * Serwis zaproszeń klientów FitCoach
 *
 * Trener wysyła zaproszenie z kodem, klient rejestruje się używając kodu.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '../supabase'

// ============================================
// TYPY
// ============================================

export interface Invitation {
	id: string
	trainer_id: string
	client_email: string
	invitation_code: string
	status: 'pending' | 'accepted' | 'expired'
	expires_at: string
	client_id: string | null
	created_at: string
	accepted_at: string | null
}

export interface CreateInvitationInput {
	client_email: string
}

// ============================================
// KLUCZE QUERY
// ============================================

export const invitationKeys = {
	all: ['invitations'] as const,
	listByTrainer: (trainerId: string) => [...invitationKeys.all, 'trainer', trainerId] as const,
}

// ============================================
// FUNKCJE API
// ============================================

/**
 * Pobiera zaproszenia trenera
 */
export async function getInvitationsByTrainer(trainerId: string): Promise<Invitation[]> {
	const { data, error } = await supabase
		.from('client_invitations')
		.select('*')
		.eq('trainer_id', trainerId)
		.order('created_at', { ascending: false })

	if (error) throw handleSupabaseError(error)
	return data as Invitation[]
}

/**
 * Tworzy nowe zaproszenie
 */
export async function createInvitation(
	trainerId: string,
	input: CreateInvitationInput
): Promise<Invitation> {
	// Sprawdź czy nie ma już pending zaproszenia dla tego emaila
	const { data: existing } = await supabase
		.from('client_invitations')
		.select('id')
		.eq('trainer_id', trainerId)
		.eq('client_email', input.client_email.toLowerCase())
		.eq('status', 'pending')
		.single()

	if (existing) {
		throw {
			message: 'Zaproszenie dla tego adresu email już istnieje',
			isAuthError: false,
			isNetworkError: false,
		}
	}

	// Sprawdź czy klient nie jest już przypisany
	const { data: existingClient } = await supabase
		.from('profiles')
		.select('id, trainer_id')
		.eq('email', input.client_email.toLowerCase())
		.single()

	if (existingClient?.trainer_id) {
		throw {
			message: 'Ten klient ma już przypisanego trenera',
			isAuthError: false,
			isNetworkError: false,
		}
	}

	const { data, error } = await supabase
		.from('client_invitations')
		.insert({
			trainer_id: trainerId,
			client_email: input.client_email.toLowerCase(),
		})
		.select()
		.single()

	if (error) throw handleSupabaseError(error)
	return data as Invitation
}

/**
 * Anuluje zaproszenie
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
	const { error } = await supabase
		.from('client_invitations')
		.update({ status: 'expired' })
		.eq('id', invitationId)

	if (error) throw handleSupabaseError(error)
}

/**
 * Ponownie wysyła zaproszenie (tworzy nowe)
 */
export async function resendInvitation(
	trainerId: string,
	clientEmail: string
): Promise<Invitation> {
	// Najpierw anuluj stare
	await supabase
		.from('client_invitations')
		.update({ status: 'expired' })
		.eq('trainer_id', trainerId)
		.eq('client_email', clientEmail.toLowerCase())
		.eq('status', 'pending')

	// Stwórz nowe
	return createInvitation(trainerId, { client_email: clientEmail })
}

/**
 * Weryfikuje kod zaproszenia (przed rejestracją)
 */
export async function verifyInvitationCode(code: string): Promise<{
	valid: boolean
	trainerName?: string
	email?: string
}> {
	const { data, error } = await supabase
		.from('client_invitations')
		.select(`
			*,
			trainer:trainer_id (first_name, last_name)
		`)
		.eq('invitation_code', code.toUpperCase())
		.eq('status', 'pending')
		.gt('expires_at', new Date().toISOString())
		.single()

	if (error || !data) {
		return { valid: false }
	}

	return {
		valid: true,
		trainerName: `${data.trainer?.first_name} ${data.trainer?.last_name}`,
		email: data.client_email,
	}
}

/**
 * Akceptuje zaproszenie (wywoływane po rejestracji)
 */
export async function acceptInvitation(
	invitationCode: string,
	clientProfileId: string
): Promise<boolean> {
	const { data, error } = await supabase.rpc('accept_invitation', {
		p_invitation_code: invitationCode.toUpperCase(),
		p_client_id: clientProfileId,
	})

	if (error) {
		console.error('Błąd akceptacji zaproszenia:', error)
		return false
	}

	return data === true
}

// ============================================
// REACT QUERY HOOKS
// ============================================

/**
 * Hook do pobierania zaproszeń trenera
 */
export function useTrainerInvitations(trainerId: string) {
	return useQuery({
		queryKey: invitationKeys.listByTrainer(trainerId),
		queryFn: () => getInvitationsByTrainer(trainerId),
		enabled: !!trainerId,
	})
}

/**
 * Hook do tworzenia zaproszenia
 */
export function useCreateInvitation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ trainerId, input }: { trainerId: string; input: CreateInvitationInput }) =>
			createInvitation(trainerId, input),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: invitationKeys.listByTrainer(variables.trainerId),
			})
		},
	})
}

/**
 * Hook do anulowania zaproszenia
 */
export function useCancelInvitation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (invitationId: string) => cancelInvitation(invitationId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: invitationKeys.all })
		},
	})
}

/**
 * Hook do ponownego wysyłania zaproszenia
 */
export function useResendInvitation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ trainerId, clientEmail }: { trainerId: string; clientEmail: string }) =>
			resendInvitation(trainerId, clientEmail),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: invitationKeys.listByTrainer(variables.trainerId),
			})
		},
	})
}

/**
 * Hook do weryfikacji kodu
 */
export function useVerifyInvitationCode(code: string) {
	return useQuery({
		queryKey: ['verify-invitation', code],
		queryFn: () => verifyInvitationCode(code),
		enabled: code.length === 6,
	})
}

// ============================================
// EKSPORT
// ============================================

export default {
	getInvitationsByTrainer,
	createInvitation,
	cancelInvitation,
	resendInvitation,
	verifyInvitationCode,
	acceptInvitation,
}

