/**
 * Storage - Lokalna pamięć offline z AsyncStorage
 * 
 * Asynchroniczny storage do przechowywania danych offline.
 * Kompatybilny z Expo Go.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

// ============================================
// KLUCZE STORAGE
// ============================================

export const STORAGE_KEYS = {
	// Cache danych
	TRAINING_PLANS: 'cache:training-plans',
	EXERCISES: 'cache:exercises',
	MEASUREMENTS: 'cache:measurements',
	COMPLETED_WORKOUTS: 'cache:completed-workouts',
	CLIENT_LIST: 'cache:client-list',
	PROFILE: 'cache:profile',
	
	// Kolejka offline
	OFFLINE_QUEUE: 'offline:queue',
	
	// Metadane
	LAST_SYNC: 'meta:last-sync',
	CACHE_VERSION: 'meta:cache-version',
} as const

// ============================================
// IN-MEMORY CACHE (dla szybkiego dostępu)
// ============================================

const memoryCache: Map<string, any> = new Map()

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Zapisz obiekt do storage (async)
 */
export async function setObjectAsync<T>(key: string, value: T): Promise<void> {
	try {
		const jsonValue = JSON.stringify(value)
		await AsyncStorage.setItem(key, jsonValue)
		memoryCache.set(key, value) // Aktualizuj memory cache
	} catch (error) {
		console.error(`[Storage] Błąd zapisu ${key}:`, error)
	}
}

/**
 * Odczytaj obiekt ze storage (async)
 */
export async function getObjectAsync<T>(key: string): Promise<T | null> {
	try {
		// Najpierw sprawdź memory cache
		if (memoryCache.has(key)) {
			return memoryCache.get(key) as T
		}
		
		const jsonValue = await AsyncStorage.getItem(key)
		if (jsonValue != null) {
			const value = JSON.parse(jsonValue) as T
			memoryCache.set(key, value) // Zapisz do memory cache
			return value
		}
	} catch (error) {
		console.error(`[Storage] Błąd odczytu ${key}:`, error)
	}
	return null
}

/**
 * Zapisz obiekt do storage (sync - używa memory cache)
 */
export function setObject<T>(key: string, value: T): void {
	memoryCache.set(key, value)
	// Zapisz asynchronicznie w tle
	setObjectAsync(key, value).catch(err => 
		console.error(`[Storage] Błąd async zapisu ${key}:`, err)
	)
}

/**
 * Odczytaj obiekt ze storage (sync - używa memory cache)
 */
export function getObject<T>(key: string): T | null {
	if (memoryCache.has(key)) {
		return memoryCache.get(key) as T
	}
	return null
}

/**
 * Usuń klucz ze storage
 */
export async function removeKeyAsync(key: string): Promise<void> {
	try {
		await AsyncStorage.removeItem(key)
		memoryCache.delete(key)
	} catch (error) {
		console.error(`[Storage] Błąd usuwania ${key}:`, error)
	}
}

export function removeKey(key: string): void {
	memoryCache.delete(key)
	removeKeyAsync(key).catch(err => 
		console.error(`[Storage] Błąd async usuwania ${key}:`, err)
	)
}

/**
 * Wyczyść cały cache (zachowaj kolejkę offline!)
 */
export async function clearCache(): Promise<void> {
	const queue = await getObjectAsync(STORAGE_KEYS.OFFLINE_QUEUE)
	
	const allKeys = await AsyncStorage.getAllKeys()
	await AsyncStorage.multiRemove(allKeys)
	memoryCache.clear()
	
	if (queue) {
		await setObjectAsync(STORAGE_KEYS.OFFLINE_QUEUE, queue)
	}
}

/**
 * Wyczyść wszystko włącznie z kolejką
 */
export async function clearAll(): Promise<void> {
	await AsyncStorage.clear()
	memoryCache.clear()
}

/**
 * Zapisz timestamp ostatniej synchronizacji
 */
export function setLastSync(key: string): void {
	const syncs = getObject<Record<string, number>>(STORAGE_KEYS.LAST_SYNC) || {}
	syncs[key] = Date.now()
	setObject(STORAGE_KEYS.LAST_SYNC, syncs)
}

/**
 * Pobierz timestamp ostatniej synchronizacji
 */
export function getLastSync(key: string): number | null {
	const syncs = getObject<Record<string, number>>(STORAGE_KEYS.LAST_SYNC)
	return syncs?.[key] || null
}

/**
 * Sprawdź czy cache jest stary (domyślnie 1 godzina)
 */
export function isCacheStale(key: string, maxAgeMs: number = 60 * 60 * 1000): boolean {
	const lastSync = getLastSync(key)
	if (!lastSync) return true
	return Date.now() - lastSync > maxAgeMs
}

/**
 * Załaduj dane z AsyncStorage do memory cache
 * Wywołaj na starcie aplikacji
 */
export async function initializeStorage(): Promise<void> {
	console.log('[Storage] Inicjalizacja...')
	
	const keys = Object.values(STORAGE_KEYS)
	
	for (const key of keys) {
		try {
			const value = await AsyncStorage.getItem(key)
			if (value) {
				memoryCache.set(key, JSON.parse(value))
			}
		} catch (error) {
			console.error(`[Storage] Błąd ładowania ${key}:`, error)
		}
	}
	
	// Załaduj też dynamiczne klucze (z prefixami użytkowników)
	const allKeys = await AsyncStorage.getAllKeys()
	for (const key of allKeys) {
		if (!memoryCache.has(key)) {
			try {
				const value = await AsyncStorage.getItem(key)
				if (value) {
					memoryCache.set(key, JSON.parse(value))
				}
			} catch (error) {
				// Ignoruj błędy dla nieznanych kluczy
			}
		}
	}
	
	console.log(`[Storage] Załadowano ${memoryCache.size} elementów do cache`)
}

// Dummy export dla kompatybilności (nieużywany)
export const storage = {
	getString: (key: string) => {
		const val = memoryCache.get(key)
		return val ? JSON.stringify(val) : undefined
	},
	set: (key: string, value: string) => {
		try {
			memoryCache.set(key, JSON.parse(value))
		} catch {
			memoryCache.set(key, value)
		}
	},
	delete: (key: string) => memoryCache.delete(key),
	clearAll: () => memoryCache.clear(),
}
