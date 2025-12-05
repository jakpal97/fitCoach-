/**
 * ChatScreen - Ekran czatu między trenerem a klientem
 *
 * Pozwala na wymianę wiadomości tekstowych.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
	View,
	Text,
	TextInput,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, handleSupabaseError } from '../../api/supabase'
import { useAuth } from '../../context/AuthContext'
import { notifyNewMessage } from '../../services/notifications'
import { messageKeys } from '../../api/services/messages'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'

type ChatRouteProp = RouteProp<AppStackParamList, 'Chat'>

// ============================================
// TYPY
// ============================================

interface Message {
	id: string
	sender_id: string
	receiver_id: string
	content: string
	is_read: boolean
	created_at: string
}

interface RecipientProfile {
	id: string
	user_id: string
	first_name: string
	last_name: string
	email: string
}

// ============================================
// API
// ============================================

async function getMessages(userId: string, recipientId: string): Promise<Message[]> {
	const { data, error } = await supabase
		.from('messages')
		.select('*')
		.or(`and(sender_id.eq.${userId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${userId})`)
		.order('created_at', { ascending: true })

	if (error) throw handleSupabaseError(error)
	return data as Message[]
}

async function getRecipientProfile(recipientProfileId: string): Promise<RecipientProfile | null> {
	// Najpierw próbuj znaleźć po profile.id
	let { data, error } = await supabase
		.from('profiles')
		.select('id, user_id, first_name, last_name, email')
		.eq('id', recipientProfileId)
		.maybeSingle()

	// Jeśli nie znaleziono, spróbuj po user_id (dla kompatybilności)
	if (!data) {
		const result = await supabase
			.from('profiles')
			.select('id, user_id, first_name, last_name, email')
			.eq('user_id', recipientProfileId)
			.maybeSingle()
		
		data = result.data
		error = result.error
	}

	if (error || !data) return null
	return data as RecipientProfile
}

async function sendMessage(
	senderId: string,
	receiverId: string,
	content: string
): Promise<Message> {
	const { data, error } = await supabase
		.from('messages')
		.insert({
			sender_id: senderId,
			receiver_id: receiverId,
			content,
		})
		.select()
		.single()

	if (error) throw handleSupabaseError(error)
	return data as Message
}

async function markAsRead(messageIds: string[]): Promise<void> {
	if (messageIds.length === 0) return

	await supabase
		.from('messages')
		.update({ is_read: true, read_at: new Date().toISOString() })
		.in('id', messageIds)
}

// ============================================
// KOMPONENT WIADOMOŚCI
// ============================================

interface MessageBubbleProps {
	message: Message
	isOwnMessage: boolean
}

function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
	const time = new Date(message.created_at).toLocaleTimeString('pl-PL', {
		hour: '2-digit',
		minute: '2-digit',
	})

	return (
		<View
			style={[
				styles.messageBubble,
				isOwnMessage ? styles.ownMessage : styles.otherMessage,
			]}>
			<Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
				{message.content}
			</Text>
			<View style={styles.messageFooter}>
				<Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
					{time}
				</Text>
				{isOwnMessage && (
					<Ionicons
						name={message.is_read ? 'checkmark-done' : 'checkmark'}
						size={14}
						color={message.is_read ? colors.success : colors.textOnPrimary + '80'}
						style={{ marginLeft: 4 }}
					/>
				)}
			</View>
		</View>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function ChatScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const route = useRoute<ChatRouteProp>()
	const { recipientId } = route.params
	const { profile } = useAuth()
	const queryClient = useQueryClient()
	const flatListRef = useRef<FlatList>(null)

	const [newMessage, setNewMessage] = useState('')
	const [isSending, setIsSending] = useState(false)

	// Pobierz profil odbiorcy
	const { data: recipient } = useQuery({
		queryKey: ['recipient-profile', recipientId],
		queryFn: async () => {
			console.log('🔍 Szukam odbiorcy z ID:', recipientId)
			const result = await getRecipientProfile(recipientId)
			console.log('👤 Znaleziony odbiorca:', result)
			return result
		},
		enabled: !!recipientId,
	})

	// Pobierz wiadomości - używaj profile.id (foreign key w tabeli messages)
	const {
		data: messages = [],
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ['messages', profile?.id, recipient?.id],
		queryFn: () => {
			if (!profile?.id || !recipient?.id) return []
			console.log('📥 Pobieranie wiadomości:', {
				myProfileId: profile.id,
				recipientProfileId: recipient.id,
			})
			return getMessages(profile.id, recipient.id)
		},
		enabled: !!profile?.id && !!recipient?.id,
		refetchInterval: 5000, // Odświeżaj co 5 sekund
	})

	// Oznacz jako przeczytane i odśwież licznik
	useEffect(() => {
		if (messages.length > 0 && profile?.id && recipient?.id) {
			const unreadMessages = messages
				.filter((m) => m.receiver_id === profile.id && !m.is_read)
				.map((m) => m.id)
			
			if (unreadMessages.length > 0) {
				markAsRead(unreadMessages).then(() => {
					// Odśwież licznik nieprzeczytanych
					queryClient.invalidateQueries({ queryKey: messageKeys.unreadCount(profile.id) })
				})
			}
		}
	}, [messages, profile?.id, recipient?.id, queryClient])

	// Scroll do końca
	useEffect(() => {
		if (messages.length > 0) {
			setTimeout(() => {
				flatListRef.current?.scrollToEnd({ animated: true })
			}, 100)
		}
	}, [messages.length])

	// ============================================
	// HANDLERS
	// ============================================

	const handleSend = useCallback(async () => {
		if (!newMessage.trim() || !profile?.id || !recipient?.id) return

		console.log('📤 Wysyłanie wiadomości:', {
			sender_id: profile.id,
			receiver_id: recipient.id,
			senderName: `${profile.first_name} ${profile.last_name}`,
			recipientName: `${recipient.first_name} ${recipient.last_name}`,
		})

		setIsSending(true)
		try {
			await sendMessage(profile.id, recipient.id, newMessage.trim())
			setNewMessage('')
			refetch()
			
			// Wyślij powiadomienie push do odbiorcy (używaj user_id dla powiadomień)
			const senderName = `${profile.first_name} ${profile.last_name}`
			notifyNewMessage(recipient.user_id, senderName, newMessage.trim())
		} catch (error) {
			console.error('Błąd wysyłania wiadomości:', error)
		} finally {
			setIsSending(false)
		}
	}, [newMessage, profile, recipient, refetch])

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
				<View style={styles.headerInfo}>
					<Text style={styles.headerTitle}>
						{recipient ? `${recipient.first_name} ${recipient.last_name}` : 'Czat'}
					</Text>
					{recipient && (
						<Text style={styles.headerSubtitle}>{recipient.email}</Text>
					)}
				</View>
				<TouchableOpacity onPress={() => refetch()}>
					<Ionicons name="refresh" size={22} color={colors.textSecondary} />
				</TouchableOpacity>
			</View>

			{/* Messages */}
			<KeyboardAvoidingView
				style={styles.content}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				keyboardVerticalOffset={90}>
				{isLoading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={colors.primary} />
					</View>
				) : messages.length === 0 ? (
					<View style={styles.emptyContainer}>
						<Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} />
						<Text style={styles.emptyText}>Brak wiadomości</Text>
						<Text style={styles.emptySubtext}>Napisz pierwszą wiadomość!</Text>
					</View>
				) : (
					<FlatList
						ref={flatListRef}
						data={messages}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<MessageBubble
								message={item}
								isOwnMessage={item.sender_id === profile?.id}
							/>
						)}
						contentContainerStyle={styles.messagesList}
						showsVerticalScrollIndicator={false}
						onContentSizeChange={() =>
							flatListRef.current?.scrollToEnd({ animated: false })
						}
					/>
				)}

				{/* Input */}
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						value={newMessage}
						onChangeText={setNewMessage}
						placeholder="Napisz wiadomość..."
						placeholderTextColor={colors.textTertiary}
						multiline
						maxLength={1000}
					/>
					<TouchableOpacity
						style={[
							styles.sendButton,
							(!newMessage.trim() || isSending) && styles.sendButtonDisabled,
						]}
						onPress={handleSend}
						disabled={!newMessage.trim() || isSending}>
						{isSending ? (
							<ActivityIndicator size="small" color={colors.textOnPrimary} />
						) : (
							<Ionicons name="send" size={20} color={colors.textOnPrimary} />
						)}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
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
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.surface,
	},
	headerInfo: {
		flex: 1,
		marginLeft: 12,
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	headerSubtitle: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 2,
	},
	content: {
		flex: 1,
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
		padding: 24,
	},
	emptyText: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
		marginTop: 16,
	},
	emptySubtext: {
		fontSize: 14,
		color: colors.textSecondary,
		marginTop: 4,
	},
	messagesList: {
		padding: 16,
		paddingBottom: 8,
	},
	messageBubble: {
		maxWidth: '80%',
		padding: 12,
		borderRadius: 16,
		marginBottom: 8,
	},
	ownMessage: {
		backgroundColor: colors.primary,
		alignSelf: 'flex-end',
		borderBottomRightRadius: 4,
	},
	otherMessage: {
		backgroundColor: colors.surface,
		alignSelf: 'flex-start',
		borderBottomLeftRadius: 4,
	},
	messageText: {
		fontSize: 15,
		color: colors.textPrimary,
		lineHeight: 20,
	},
	ownMessageText: {
		color: colors.textOnPrimary,
	},
	messageFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		marginTop: 4,
	},
	messageTime: {
		fontSize: 11,
		color: colors.textTertiary,
	},
	ownMessageTime: {
		color: colors.textOnPrimary + '80',
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		padding: 12,
		paddingBottom: 24,
		borderTopWidth: 1,
		borderTopColor: colors.surface,
		backgroundColor: colors.background,
	},
	input: {
		flex: 1,
		backgroundColor: colors.surface,
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 10,
		paddingRight: 12,
		fontSize: 15,
		color: colors.textPrimary,
		maxHeight: 100,
	},
	sendButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
		marginLeft: 8,
	},
	sendButtonDisabled: {
		backgroundColor: colors.textTertiary,
	},
})

