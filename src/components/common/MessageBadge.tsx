/**
 * MessageBadge - Ikona wiadomości z badge'em nieprzeczytanych
 * 
 * Wyświetla ikonę czatu z liczbą nieprzeczytanych wiadomości.
 */

import React, { useCallback } from 'react'
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../context/AuthContext'
import { useUnreadMessages, useMessagesSubscription } from '../../api/services/messages'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'

interface MessageBadgeProps {
	/** ID odbiorcy do nawigacji do chatu (dla klienta) */
	recipientId?: string
	/** Rozmiar ikony */
	size?: number
	/** Czy pokazywać tylko badge bez nawigacji */
	badgeOnly?: boolean
	/** Czy nawigować do listy wiadomości zamiast pojedynczego chatu (dla trenera) */
	navigateToList?: boolean
}

export default function MessageBadge({ 
	recipientId, 
	size = 24,
	badgeOnly = false,
	navigateToList = false,
}: MessageBadgeProps) {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const { profile } = useAuth()

	// Pobierz liczbę nieprzeczytanych wiadomości
	const { data: unreadData } = useUnreadMessages(profile?.id)
	
	// Subskrybuj nowe wiadomości w czasie rzeczywistym
	useMessagesSubscription(profile?.id, (senderId) => {
		// Opcjonalnie: pokaż alert o nowej wiadomości
		console.log('📬 Nowa wiadomość od:', senderId)
	})

	const unreadCount = unreadData?.total || 0

	const handlePress = useCallback(() => {
		if (badgeOnly) return
		
		// Trener - idź do listy wiadomości
		if (navigateToList) {
			navigation.navigate('MessagesList')
			return
		}
		
		// Klient - idź bezpośrednio do chatu z trenerem
		if (recipientId) {
			navigation.navigate('Chat', { recipientId })
		} else {
			Alert.alert('Chat', 'Wybierz osobę do rozmowy')
		}
	}, [recipientId, navigation, badgeOnly, navigateToList])

	return (
		<TouchableOpacity 
			style={styles.container} 
			onPress={handlePress}
			disabled={badgeOnly}
			activeOpacity={badgeOnly ? 1 : 0.7}
		>
			<Ionicons 
				name="chatbubble-ellipses" 
				size={size} 
				color={colors.textPrimary} 
			/>
			{unreadCount > 0 && (
				<View style={styles.badge}>
					<Text style={styles.badgeText}>
						{unreadCount > 99 ? '99+' : unreadCount}
					</Text>
				</View>
			)}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	container: {
		position: 'relative',
		padding: 4,
	},
	badge: {
		position: 'absolute',
		top: 0,
		right: 0,
		backgroundColor: colors.error,
		borderRadius: 10,
		minWidth: 18,
		height: 18,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 4,
	},
	badgeText: {
		color: '#fff',
		fontSize: 10,
		fontWeight: 'bold',
	},
})

