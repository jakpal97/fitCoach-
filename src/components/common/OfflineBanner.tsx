/**
 * OfflineBanner - Komponent informujący o trybie offline
 * 
 * Wyświetla banner gdy brak połączenia z internetem.
 * Pokazuje też liczbę oczekujących operacji do synchronizacji.
 */

import React, { useEffect, useState } from 'react'
import { 
	View, 
	Text, 
	StyleSheet, 
	Animated, 
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNetworkStatus, offlineQueue } from '../../services/offline'
import { colors } from '../../theme/colors'

interface OfflineBannerProps {
	showPendingCount?: boolean
}

export function OfflineBanner({ showPendingCount = true }: OfflineBannerProps) {
	const { isOffline, isOnline } = useNetworkStatus()
	const insets = useSafeAreaInsets()
	
	const [pendingCount, setPendingCount] = useState(0)
	const [isSyncing, setIsSyncing] = useState(false)
	const [showSuccess, setShowSuccess] = useState(false)
	
	const slideAnim = React.useRef(new Animated.Value(-100)).current
	const successAnim = React.useRef(new Animated.Value(0)).current
	
	// Aktualizuj liczbę oczekujących
	useEffect(() => {
		setPendingCount(offlineQueue.getPendingCount())
		
		const interval = setInterval(() => {
			setPendingCount(offlineQueue.getPendingCount())
		}, 2000)
		
		return () => clearInterval(interval)
	}, [isOnline])
	
	// Nasłuchuj na stan synchronizacji
	useEffect(() => {
		const removeSyncListener = offlineQueue.addSyncListener(syncing => {
			setIsSyncing(syncing)
			
			if (!syncing && pendingCount > 0) {
				// Pokaż sukces po synchronizacji
				setShowSuccess(true)
				Animated.sequence([
					Animated.timing(successAnim, {
						toValue: 1,
						duration: 300,
						useNativeDriver: true,
					}),
					Animated.delay(2000),
					Animated.timing(successAnim, {
						toValue: 0,
						duration: 300,
						useNativeDriver: true,
					}),
				]).start(() => setShowSuccess(false))
			}
		})
		
		return removeSyncListener
	}, [pendingCount])
	
	// Animacja wejścia/wyjścia
	useEffect(() => {
		const shouldShow = isOffline || pendingCount > 0 || isSyncing || showSuccess
		
		Animated.timing(slideAnim, {
			toValue: shouldShow ? 0 : -100,
			duration: 300,
			useNativeDriver: true,
		}).start()
	}, [isOffline, pendingCount, isSyncing, showSuccess])
	
	const handleSync = async () => {
		if (isOnline && pendingCount > 0 && !isSyncing) {
			await offlineQueue.syncAll()
		}
	}
	
	// Określ kolor i tekst na podstawie stanu
	let backgroundColor = colors.warning
	let icon: 'cloud-offline' | 'sync' | 'checkmark-circle' = 'cloud-offline'
	let message = 'Tryb offline'
	
	if (showSuccess) {
		backgroundColor = colors.success
		icon = 'checkmark-circle'
		message = 'Zsynchronizowano!'
	} else if (isSyncing) {
		backgroundColor = colors.primary
		icon = 'sync'
		message = 'Synchronizuję...'
	} else if (isOnline && pendingCount > 0) {
		backgroundColor = colors.info || colors.primary
		icon = 'sync'
		message = `${pendingCount} do synchronizacji`
	} else if (isOffline) {
		backgroundColor = colors.warning
		icon = 'cloud-offline'
		message = pendingCount > 0 
			? `Offline • ${pendingCount} zapisanych lokalnie`
			: 'Tryb offline'
	}
	
	// Nie renderuj jeśli wszystko OK
	if (!isOffline && pendingCount === 0 && !isSyncing && !showSuccess) {
		return null
	}
	
	return (
		<Animated.View
			style={[
				styles.container,
				{ 
					transform: [{ translateY: slideAnim }],
					paddingTop: insets.top > 0 ? insets.top : 8,
					backgroundColor,
				},
			]}
		>
			<TouchableOpacity 
				style={styles.content}
				onPress={handleSync}
				disabled={!isOnline || pendingCount === 0 || isSyncing}
				activeOpacity={0.8}
			>
				{isSyncing ? (
					<ActivityIndicator size="small" color={colors.textOnPrimary} />
				) : (
					<Ionicons name={icon} size={18} color={colors.textOnPrimary} />
				)}
				
				<Text style={styles.text}>{message}</Text>
				
				{isOnline && pendingCount > 0 && !isSyncing && (
					<View style={styles.syncButton}>
						<Text style={styles.syncButtonText}>Synchronizuj</Text>
					</View>
				)}
			</TouchableOpacity>
		</Animated.View>
	)
}

// ============================================
// MINI INDICATOR (dla headerów)
// ============================================

export function OfflineIndicator() {
	const { isOffline } = useNetworkStatus()
	const [pendingCount, setPendingCount] = useState(0)
	
	useEffect(() => {
		setPendingCount(offlineQueue.getPendingCount())
		const interval = setInterval(() => {
			setPendingCount(offlineQueue.getPendingCount())
		}, 3000)
		return () => clearInterval(interval)
	}, [])
	
	if (!isOffline && pendingCount === 0) return null
	
	return (
		<View style={styles.indicator}>
			<Ionicons 
				name={isOffline ? "cloud-offline" : "sync"} 
				size={16} 
				color={isOffline ? colors.warning : colors.primary} 
			/>
			{pendingCount > 0 && (
				<View style={styles.badge}>
					<Text style={styles.badgeText}>{pendingCount}</Text>
				</View>
			)}
		</View>
	)
}

// ============================================
// STYLE
// ============================================

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 1000,
		paddingBottom: 8,
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
		gap: 8,
	},
	text: {
		color: colors.textOnPrimary,
		fontSize: 14,
		fontWeight: '600',
	},
	syncButton: {
		backgroundColor: 'rgba(255,255,255,0.2)',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		marginLeft: 8,
	},
	syncButtonText: {
		color: colors.textOnPrimary,
		fontSize: 12,
		fontWeight: '600',
	},
	// Indicator
	indicator: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 4,
	},
	badge: {
		position: 'absolute',
		top: 0,
		right: 0,
		backgroundColor: colors.error,
		borderRadius: 8,
		minWidth: 16,
		height: 16,
		justifyContent: 'center',
		alignItems: 'center',
	},
	badgeText: {
		color: colors.textOnPrimary,
		fontSize: 10,
		fontWeight: 'bold',
	},
})

