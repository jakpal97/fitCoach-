/**
 * Serwis wiadomości - zarządzanie chatem i nieprzeczytanymi wiadomościami
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase, handleSupabaseError } from '../supabase'

// ============================================
// TYPY
// ============================================

export interface UnreadCount {
	total: number
	bySender: Record<string, number>
}

// ============================================
// KLUCZE QUERY
// ============================================

export const messageKeys = {
	all: ['messages'] as const,
	unreadCount: (userId: string) => [...messageKeys.all, 'unread', userId] as const,
}

// ============================================
// FUNKCJE API
// ============================================

/**
 * Pobiera liczbę nieprzeczytanych wiadomości dla użytkownika
 */
export async function getUnreadMessagesCount(profileId: string): Promise<UnreadCount> {
	const { data, error } = await supabase
		.from('messages')
		.select('id, sender_id')
		.eq('receiver_id', profileId)
		.eq('is_read', false)

	if (error) throw handleSupabaseError(error)

	const messages = data || []
	const total = messages.length
	
	// Grupuj po nadawcy
	const bySender: Record<string, number> = {}
	messages.forEach(msg => {
		bySender[msg.sender_id] = (bySender[msg.sender_id] || 0) + 1
	})

	return { total, bySender }
}

// ============================================
// REACT QUERY HOOKS
// ============================================

/**
 * Hook do pobierania liczby nieprzeczytanych wiadomości
 */
export function useUnreadMessages(profileId: string | undefined) {
	return useQuery({
		queryKey: messageKeys.unreadCount(profileId || ''),
		queryFn: () => getUnreadMessagesCount(profileId!),
		enabled: !!profileId,
		refetchInterval: 10000, // Odświeżaj co 10 sekund
		staleTime: 5000,
	})
}

/**
 * Hook do subskrypcji real-time nowych wiadomości
 */
export function useMessagesSubscription(
	profileId: string | undefined,
	onNewMessage?: (senderId: string) => void
) {
	const queryClient = useQueryClient()

	useEffect(() => {
		if (!profileId) return

		// Subskrybuj nowe wiadomości w czasie rzeczywistym
		const channel = supabase
			.channel(`messages:${profileId}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'messages',
					filter: `receiver_id=eq.${profileId}`,
				},
				(payload) => {
					console.log('📩 Nowa wiadomość:', payload.new)
					// Odśwież licznik nieprzeczytanych
					queryClient.invalidateQueries({ queryKey: messageKeys.unreadCount(profileId) })
					// Callback
					if (onNewMessage && payload.new) {
						onNewMessage((payload.new as any).sender_id)
					}
				}
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [profileId, queryClient, onNewMessage])
}


