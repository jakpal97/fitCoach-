/**
 * MessagesListScreen - Lista wszystkich konwersacji
 *
 * Dla trenera: lista konwersacji z klientami
 * Dla klienta: konwersacja z trenerem
 */

import React, { useMemo } from 'react'
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useQuery } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '../../api/supabase'
import { useAuth } from '../../context/AuthContext'
import { useUnreadMessages } from '../../api/services/messages'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'

// ============================================
// TYPY
// ============================================

interface Conversation {
	recipientId: string
	recipientName: string
	recipientInitials: string
	lastMessage: string
	lastMessageTime: string
	unreadCount: number
	isFromMe: boolean
}

// ============================================
// API
// ============================================

async function getConversations(profileId: string, role: 'trainer' | 'client'): Promise<Conversation[]> {
	// Pobierz wszystkie wiadomości użytkownika
	const { data: messages, error } = await supabase
		.from('messages')
		.select(`
			id,
			sender_id,
			receiver_id,
			content,
			is_read,
			created_at
		`)
		.or(`sender_id.eq.${profileId},receiver_id.eq.${profileId}`)
		.order('created_at', { ascending: false })

	if (error) throw handleSupabaseError(error)

	// Grupuj po rozmówcy
	const conversationsMap = new Map<string, {
		recipientId: string
		lastMessage: string
		lastMessageTime: string
		unreadCount: number
		isFromMe: boolean
	}>()

	for (const msg of messages || []) {
		const recipientId = msg.sender_id === profileId ? msg.receiver_id : msg.sender_id
		const isFromMe = msg.sender_id === profileId

		if (!conversationsMap.has(recipientId)) {
			conversationsMap.set(recipientId, {
				recipientId,
				lastMessage: msg.content,
				lastMessageTime: msg.created_at,
				unreadCount: (!isFromMe && !msg.is_read) ? 1 : 0,
				isFromMe,
			})
		} else {
			const existing = conversationsMap.get(recipientId)!
			if (!isFromMe && !msg.is_read) {
				existing.unreadCount++
			}
		}
	}

	// Pobierz profile rozmówców
	const recipientIds = Array.from(conversationsMap.keys())
	if (recipientIds.length === 0) return []

	const { data: profiles, error: profilesError } = await supabase
		.from('profiles')
		.select('id, first_name, last_name')
		.in('id', recipientIds)

	if (profilesError) throw handleSupabaseError(profilesError)

	// Połącz dane
	const conversations: Conversation[] = []
	for (const [recipientId, conv] of conversationsMap) {
		const profile = profiles?.find(p => p.id === recipientId)
		if (profile) {
			conversations.push({
				...conv,
				recipientName: `${profile.first_name} ${profile.last_name}`,
				recipientInitials: `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase(),
			})
		}
	}

	// Sortuj po czasie ostatniej wiadomości
	conversations.sort((a, b) => 
		new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
	)

	return conversations
}

// ============================================
// KOMPONENT KONWERSACJI
// ============================================

interface ConversationCardProps {
	conversation: Conversation
	onPress: () => void
}

function ConversationCard({ conversation, onPress }: ConversationCardProps) {
	const timeAgo = useMemo(() => {
		const date = new Date(conversation.lastMessageTime)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffMins = Math.floor(diffMs / 60000)
		const diffHours = Math.floor(diffMins / 60)
		const diffDays = Math.floor(diffHours / 24)

		if (diffMins < 1) return 'teraz'
		if (diffMins < 60) return `${diffMins} min`
		if (diffHours < 24) return `${diffHours} godz.`
		if (diffDays < 7) return `${diffDays} dni`
		return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
	}, [conversation.lastMessageTime])

	return (
		<TouchableOpacity style={styles.conversationCard} onPress={onPress} activeOpacity={0.7}>
			{/* Avatar */}
			<View style={[styles.avatar, conversation.unreadCount > 0 && styles.avatarUnread]}>
				<Text style={styles.avatarText}>{conversation.recipientInitials}</Text>
			</View>

			{/* Info */}
			<View style={styles.conversationInfo}>
				<View style={styles.conversationHeader}>
					<Text style={[
						styles.recipientName,
						conversation.unreadCount > 0 && styles.recipientNameUnread
					]}>
						{conversation.recipientName}
					</Text>
					<Text style={styles.timeText}>{timeAgo}</Text>
				</View>
				<View style={styles.messagePreviewRow}>
					<Text 
						style={[
							styles.messagePreview,
							conversation.unreadCount > 0 && styles.messagePreviewUnread
						]} 
						numberOfLines={1}
					>
						{conversation.isFromMe ? 'Ty: ' : ''}{conversation.lastMessage}
					</Text>
					{conversation.unreadCount > 0 && (
						<View style={styles.unreadBadge}>
							<Text style={styles.unreadBadgeText}>{conversation.unreadCount}</Text>
						</View>
					)}
				</View>
			</View>

			<Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
		</TouchableOpacity>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function MessagesListScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const { profile } = useAuth()

	const { 
		data: conversations = [], 
		isLoading, 
		refetch, 
		isRefetching 
	} = useQuery({
		queryKey: ['conversations', profile?.id],
		queryFn: () => getConversations(profile!.id, profile?.role as 'trainer' | 'client'),
		enabled: !!profile?.id,
		refetchInterval: 10000,
	})

	const { data: unreadData } = useUnreadMessages(profile?.id)
	const totalUnread = unreadData?.total || 0

	const handleConversationPress = (recipientId: string) => {
		navigation.navigate('Chat', { recipientId })
	}

	// ============================================
	// RENDER
	// ============================================

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Wiadomości</Text>
				<View style={styles.headerRight}>
					{totalUnread > 0 && (
						<View style={styles.totalUnreadBadge}>
							<Text style={styles.totalUnreadText}>{totalUnread}</Text>
						</View>
					)}
				</View>
			</View>

			{/* Lista konwersacji */}
			{isLoading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			) : conversations.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} />
					<Text style={styles.emptyTitle}>Brak wiadomości</Text>
					<Text style={styles.emptyText}>
						Tutaj pojawią się Twoje konwersacje z {profile?.role === 'trainer' ? 'klientami' : 'trenerem'}
					</Text>
				</View>
			) : (
				<FlatList
					data={conversations}
					keyExtractor={(item) => item.recipientId}
					renderItem={({ item }) => (
						<ConversationCard
							conversation={item}
							onPress={() => handleConversationPress(item.recipientId)}
						/>
					)}
					contentContainerStyle={styles.listContent}
					refreshControl={
						<RefreshControl
							refreshing={isRefetching}
							onRefresh={refetch}
							tintColor={colors.primary}
						/>
					}
					showsVerticalScrollIndicator={false}
				/>
			)}
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
	headerRight: {
		width: 40,
		alignItems: 'flex-end',
	},
	totalUnreadBadge: {
		backgroundColor: colors.primary,
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	totalUnreadText: {
		color: colors.textOnPrimary,
		fontSize: 12,
		fontWeight: 'bold',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 40,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
		marginTop: 16,
	},
	emptyText: {
		fontSize: 14,
		color: colors.textSecondary,
		textAlign: 'center',
		marginTop: 8,
	},
	listContent: {
		padding: 16,
	},
	conversationCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		padding: 14,
		borderRadius: 12,
		marginBottom: 10,
	},
	avatar: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: colors.primary + '30',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	avatarUnread: {
		backgroundColor: colors.primary,
	},
	avatarText: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.primary,
	},
	conversationInfo: {
		flex: 1,
	},
	conversationHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	recipientName: {
		fontSize: 15,
		fontWeight: '500',
		color: colors.textPrimary,
	},
	recipientNameUnread: {
		fontWeight: '700',
	},
	timeText: {
		fontSize: 12,
		color: colors.textTertiary,
	},
	messagePreviewRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	messagePreview: {
		flex: 1,
		fontSize: 13,
		color: colors.textSecondary,
	},
	messagePreviewUnread: {
		color: colors.textPrimary,
		fontWeight: '500',
	},
	unreadBadge: {
		backgroundColor: colors.primary,
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 6,
		marginLeft: 8,
	},
	unreadBadgeText: {
		color: colors.textOnPrimary,
		fontSize: 11,
		fontWeight: 'bold',
	},
})

