/**
 * Offline Queue - Kolejka operacji do wykonania po powrocie online
 * 
 * Zapisuje operacje lokalne i synchronizuje je z serwerem.
 */

import { storage, STORAGE_KEYS, getObject, setObject } from './storage'
import { getNetworkStatus, addNetworkListener } from './networkStatus'

// ============================================
// TYPY
// ============================================

export type OperationType = 
	| 'SAVE_WORKOUT'        // Zapisz ukończony trening
	| 'SAVE_MEASUREMENT'    // Zapisz pomiar
	| 'UPDATE_PLAN'         // Zaktualizuj plan (trener)
	| 'ADD_EXERCISE'        // Dodaj ćwiczenie (trener)
	| 'UPDATE_EXERCISE'     // Zaktualizuj ćwiczenie (trener)
	| 'DELETE_EXERCISE'     // Usuń ćwiczenie (trener)

export interface QueuedOperation {
	id: string
	type: OperationType
	data: any
	timestamp: number
	retryCount: number
	userId: string
}

export type OperationHandler = (operation: QueuedOperation) => Promise<void>

// ============================================
// QUEUE MANAGER
// ============================================

class OfflineQueueManager {
	private handlers: Map<OperationType, OperationHandler> = new Map()
	private isSyncing = false
	private syncListeners: Set<(syncing: boolean) => void> = new Set()
	
	constructor() {
		// Automatyczna synchronizacja po powrocie online
		addNetworkListener((online) => {
			if (online) {
				console.log('[OfflineQueue] Powrót online - rozpoczynam synchronizację')
				this.syncAll()
			}
		})
	}
	
	/**
	 * Zarejestruj handler dla typu operacji
	 */
	registerHandler(type: OperationType, handler: OperationHandler): void {
		this.handlers.set(type, handler)
	}
	
	/**
	 * Dodaj operację do kolejki
	 */
	addToQueue(type: OperationType, data: any, userId: string): string {
		const queue = this.getQueue()
		
		const operation: QueuedOperation = {
			id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			type,
			data,
			timestamp: Date.now(),
			retryCount: 0,
			userId,
		}
		
		queue.push(operation)
		this.saveQueue(queue)
		
		console.log(`[OfflineQueue] Dodano do kolejki: ${type}`, operation.id)
		
		// Spróbuj zsynchronizować natychmiast jeśli online
		if (getNetworkStatus()) {
			this.syncAll()
		}
		
		return operation.id
	}
	
	/**
	 * Pobierz kolejkę z storage
	 */
	getQueue(): QueuedOperation[] {
		return getObject<QueuedOperation[]>(STORAGE_KEYS.OFFLINE_QUEUE) || []
	}
	
	/**
	 * Zapisz kolejkę do storage
	 */
	private saveQueue(queue: QueuedOperation[]): void {
		setObject(STORAGE_KEYS.OFFLINE_QUEUE, queue)
	}
	
	/**
	 * Usuń operację z kolejki
	 */
	private removeFromQueue(operationId: string): void {
		const queue = this.getQueue().filter(op => op.id !== operationId)
		this.saveQueue(queue)
	}
	
	/**
	 * Zaktualizuj operację w kolejce (np. zwiększ retryCount)
	 */
	private updateInQueue(operationId: string, updates: Partial<QueuedOperation>): void {
		const queue = this.getQueue().map(op => 
			op.id === operationId ? { ...op, ...updates } : op
		)
		this.saveQueue(queue)
	}
	
	/**
	 * Zsynchronizuj wszystkie operacje w kolejce
	 */
	async syncAll(): Promise<{ success: number; failed: number }> {
		if (this.isSyncing) {
			console.log('[OfflineQueue] Synchronizacja już w toku...')
			return { success: 0, failed: 0 }
		}
		
		if (!getNetworkStatus()) {
			console.log('[OfflineQueue] Brak internetu - pomijam synchronizację')
			return { success: 0, failed: 0 }
		}
		
		const queue = this.getQueue()
		if (queue.length === 0) {
			console.log('[OfflineQueue] Kolejka pusta')
			return { success: 0, failed: 0 }
		}
		
		console.log(`[OfflineQueue] Synchronizuję ${queue.length} operacji...`)
		this.isSyncing = true
		this.notifySyncListeners(true)
		
		let success = 0
		let failed = 0
		
		// Sortuj po timestamp (najstarsze najpierw)
		const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp)
		
		for (const operation of sortedQueue) {
			const handler = this.handlers.get(operation.type)
			
			if (!handler) {
				console.warn(`[OfflineQueue] Brak handlera dla: ${operation.type}`)
				failed++
				continue
			}
			
			try {
				await handler(operation)
				this.removeFromQueue(operation.id)
				success++
				console.log(`[OfflineQueue] ✅ Zsynchronizowano: ${operation.type}`)
			} catch (error) {
				console.error(`[OfflineQueue] ❌ Błąd: ${operation.type}`, error)
				
				// Zwiększ retry count
				const newRetryCount = operation.retryCount + 1
				
				if (newRetryCount >= 5) {
					// Po 5 próbach - usuń z kolejki i zaloguj błąd
					console.error(`[OfflineQueue] Przekroczono limit prób dla: ${operation.id}`)
					this.removeFromQueue(operation.id)
				} else {
					this.updateInQueue(operation.id, { retryCount: newRetryCount })
				}
				
				failed++
			}
		}
		
		this.isSyncing = false
		this.notifySyncListeners(false)
		
		console.log(`[OfflineQueue] Synchronizacja zakończona: ${success} sukces, ${failed} błędów`)
		return { success, failed }
	}
	
	/**
	 * Sprawdź czy trwa synchronizacja
	 */
	getIsSyncing(): boolean {
		return this.isSyncing
	}
	
	/**
	 * Dodaj listener na stan synchronizacji
	 */
	addSyncListener(listener: (syncing: boolean) => void): () => void {
		this.syncListeners.add(listener)
		return () => this.syncListeners.delete(listener)
	}
	
	private notifySyncListeners(syncing: boolean): void {
		this.syncListeners.forEach(listener => listener(syncing))
	}
	
	/**
	 * Pobierz liczbę oczekujących operacji
	 */
	getPendingCount(): number {
		return this.getQueue().length
	}
	
	/**
	 * Wyczyść całą kolejkę (ostrożnie!)
	 */
	clearQueue(): void {
		this.saveQueue([])
	}
}

// Singleton
export const offlineQueue = new OfflineQueueManager()

