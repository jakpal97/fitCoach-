/**
 * Network Status - Wykrywanie stanu połączenia
 * 
 * Hook i utility do sprawdzania czy jest internet.
 */

import { useState, useEffect, useCallback } from 'react'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'

// ============================================
// SINGLETON STATE
// ============================================

let isOnline = true
let listeners: Set<(online: boolean) => void> = new Set()

/**
 * Inicjalizuj nasłuchiwanie na zmiany sieci
 */
export function initNetworkListener(): () => void {
	const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
		const newOnlineState = state.isConnected === true && state.isInternetReachable !== false
		
		if (newOnlineState !== isOnline) {
			isOnline = newOnlineState
			console.log(`[Network] Status: ${isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}`)
			
			// Powiadom wszystkich słuchaczy
			listeners.forEach(listener => listener(isOnline))
		}
	})
	
	return unsubscribe
}

/**
 * Sprawdź aktualny stan sieci (synchronicznie)
 */
export function getNetworkStatus(): boolean {
	return isOnline
}

/**
 * Sprawdź stan sieci (asynchronicznie - dokładniejsze)
 */
export async function checkNetworkStatus(): Promise<boolean> {
	try {
		const state = await NetInfo.fetch()
		isOnline = state.isConnected === true && state.isInternetReachable !== false
		return isOnline
	} catch (error) {
		console.error('[Network] Błąd sprawdzania sieci:', error)
		return isOnline
	}
}

/**
 * Dodaj listener na zmiany sieci
 */
export function addNetworkListener(listener: (online: boolean) => void): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

// ============================================
// REACT HOOK
// ============================================

/**
 * Hook do śledzenia stanu sieci w komponentach
 */
export function useNetworkStatus() {
	const [online, setOnline] = useState(isOnline)
	
	useEffect(() => {
		// Ustaw aktualny stan
		setOnline(isOnline)
		
		// Nasłuchuj zmian
		const removeListener = addNetworkListener(setOnline)
		
		return removeListener
	}, [])
	
	const refresh = useCallback(async () => {
		const status = await checkNetworkStatus()
		setOnline(status)
		return status
	}, [])
	
	return {
		isOnline: online,
		isOffline: !online,
		refresh,
	}
}

