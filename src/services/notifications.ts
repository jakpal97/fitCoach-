/**
 * Serwis powiadomień push
 *
 * Zarządza rejestracją tokenów i wysyłaniem powiadomień.
 */

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from '../api/supabase'

// ============================================
// KONFIGURACJA POWIADOMIEŃ
// ============================================

// Ustaw zachowanie powiadomień gdy app jest na pierwszym planie
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
})

// ============================================
// TYPY
// ============================================

export interface PushNotificationData {
	title: string
	body: string
	data?: Record<string, unknown>
}

// ============================================
// FUNKCJE POMOCNICZE
// ============================================

/**
 * Zarejestruj urządzenie do powiadomień push
 * Zwraca Expo Push Token lub null jeśli nie udało się
 */
export async function registerForPushNotifications(): Promise<string | null> {
	// Sprawdź czy to prawdziwe urządzenie
	if (!Device.isDevice) {
		console.log('Push notifications nie działają na emulatorze')
		return null
	}

	// Sprawdź/poproś o uprawnienia
	const { status: existingStatus } = await Notifications.getPermissionsAsync()
	let finalStatus = existingStatus

	if (existingStatus !== 'granted') {
		const { status } = await Notifications.requestPermissionsAsync()
		finalStatus = status
	}

	if (finalStatus !== 'granted') {
		console.log('Brak uprawnień do powiadomień push')
		return null
	}

	// Konfiguracja kanału dla Android
	if (Platform.OS === 'android') {
		await Notifications.setNotificationChannelAsync('default', {
			name: 'FitCoach',
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: '#7A1022',
		})
	}

	// Pobierz token
	try {
		// W Expo Go push notifications nie są w pełni wspierane
		// Wymagany jest development build dla pełnej funkcjonalności
		const tokenData = await Notifications.getExpoPushTokenAsync()
		return tokenData.data
	} catch (error: any) {
		// Ignoruj błąd projectId w Expo Go - to oczekiwane zachowanie
		if (error?.message?.includes('projectId') || error?.code === 'ERR_NOTIFICATIONS_PUSH_TOKEN') {
			console.log('Push notifications wymagają development build (nie Expo Go)')
			return null
		}
		console.error('Błąd pobierania push token:', error)
		return null
	}
}

/**
 * Zapisz token w bazie danych
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
	const platform = Platform.OS as 'ios' | 'android'

	// Sprawdź czy token już istnieje
	const { data: existing } = await supabase
		.from('notification_tokens')
		.select('id')
		.eq('user_id', userId)
		.eq('expo_push_token', token)
		.maybeSingle()

	if (existing) {
		// Zaktualizuj last_used
		await supabase.from('notification_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', existing.id)
	} else {
		// Dodaj nowy token
		await supabase.from('notification_tokens').insert({
			user_id: userId,
			expo_push_token: token,
			platform,
			is_active: true,
		})
	}
}

/**
 * Usuń token przy wylogowaniu
 * W Expo Go ta funkcja może nie działać - to normalne
 */
export async function removePushToken(userId: string): Promise<void> {
	try {
		const tokenData = await Notifications.getExpoPushTokenAsync()
		await supabase.from('notification_tokens').delete().eq('user_id', userId).eq('expo_push_token', tokenData.data)
	} catch (error: any) {
		// Ignoruj błąd projectId w Expo Go - usuń wszystkie tokeny użytkownika
		if (error?.message?.includes('projectId')) {
			await supabase.from('notification_tokens').delete().eq('user_id', userId)
			return
		}
		console.log('Push token nie usunięty (Expo Go)')
	}
}

/**
 * Wyślij powiadomienie lokalne (do testów)
 */
export async function sendLocalNotification(notification: PushNotificationData): Promise<void> {
	await Notifications.scheduleNotificationAsync({
		content: {
			title: notification.title,
			body: notification.body,
			data: notification.data,
		},
		trigger: null, // Natychmiast
	})
}

/**
 * Wyślij powiadomienie push do użytkownika
 * UWAGA: W produkcji powinno to być wywołane z backendu!
 */
export async function sendPushNotification(
	expoPushToken: string,
	notification: PushNotificationData
): Promise<boolean> {
	const message = {
		to: expoPushToken,
		sound: 'default',
		title: notification.title,
		body: notification.body,
		data: notification.data || {},
	}

	try {
		const response = await fetch('https://exp.host/--/api/v2/push/send', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Accept-encoding': 'gzip, deflate',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(message),
		})

		return response.ok
	} catch (error) {
		console.error('Błąd wysyłania push notification:', error)
		return false
	}
}

/**
 * Wyślij powiadomienie do użytkownika (po user_id)
 */
export async function notifyUser(userId: string, notification: PushNotificationData): Promise<void> {
	// Pobierz tokeny użytkownika
	const { data: tokens } = await supabase
		.from('notification_tokens')
		.select('expo_push_token')
		.eq('user_id', userId)
		.eq('is_active', true)

	if (!tokens || tokens.length === 0) {
		console.log('Brak aktywnych tokenów dla użytkownika:', userId)
		return
	}

	// Wyślij do wszystkich urządzeń użytkownika
	await Promise.all(tokens.map(t => sendPushNotification(t.expo_push_token, notification)))

	// Zapisz w tabeli notifications
	await supabase.from('notifications').insert({
		user_id: userId,
		title: notification.title,
		message: notification.body,
		type: 'push',
		data: notification.data || {},
	})
}

// ============================================
// TYPY POWIADOMIEŃ
// ============================================

export const NotificationTypes = {
	// Wiadomości
	NEW_MESSAGE: 'new_message',
	// Treningi
	WORKOUT_REMINDER: 'workout_reminder',
	WORKOUT_COMPLETED: 'workout_completed',
	// Plany
	NEW_PLAN: 'new_plan',
	PLAN_UPDATED: 'plan_updated',
	// Klienci
	NEW_CLIENT: 'new_client',
	// Pomiary
	MEASUREMENT_REMINDER: 'measurement_reminder',
} as const

/**
 * Powiadom o nowej wiadomości
 */
export async function notifyNewMessage(
	recipientUserId: string, 
	senderName: string, 
	messagePreview?: string
): Promise<void> {
	const body = messagePreview 
		? `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`
		: `${senderName} wysłał/a Ci wiadomość`
	
	await notifyUser(recipientUserId, {
		title: 'Nowa wiadomość 💬',
		body,
		data: { type: NotificationTypes.NEW_MESSAGE },
	})
}

/**
 * Powiadom o przypomnieniu treningu
 */
export async function notifyWorkoutReminder(clientUserId: string, workoutName: string): Promise<void> {
	await notifyUser(clientUserId, {
		title: 'Czas na trening! 💪',
		body: `Dziś masz zaplanowany: ${workoutName}`,
		data: { type: NotificationTypes.WORKOUT_REMINDER },
	})
}

/**
 * Powiadom trenera o ukończonym treningu
 */
export async function notifyWorkoutCompleted(trainerUserId: string, clientName: string): Promise<void> {
	await notifyUser(trainerUserId, {
		title: 'Trening ukończony ✅',
		body: `${clientName} ukończył/a trening`,
		data: { type: NotificationTypes.WORKOUT_COMPLETED },
	})
}

/**
 * Powiadom klienta o nowym planie
 */
export async function notifyNewPlan(clientUserId: string, trainerName: string): Promise<void> {
	await notifyUser(clientUserId, {
		title: 'Nowy plan treningowy 📋',
		body: `${trainerName} przygotował/a dla Ciebie nowy plan`,
		data: { type: NotificationTypes.NEW_PLAN },
	})
}

/**
 * Powiadom trenera o nowym kliencie
 */
export async function notifyNewClient(trainerUserId: string, clientName: string): Promise<void> {
	await notifyUser(trainerUserId, {
		title: 'Nowy klient 🎉',
		body: `${clientName} dołączył/a do Twojej listy klientów`,
		data: { type: NotificationTypes.NEW_CLIENT },
	})
}
