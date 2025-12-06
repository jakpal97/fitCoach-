/**
 * Offline Services - Eksport wszystkich funkcji offline
 */

// Storage
export { 
	storage, 
	STORAGE_KEYS,
	setObject,
	getObject,
	removeKey,
	clearCache,
	clearAll,
	setLastSync,
	getLastSync,
	isCacheStale,
	initializeStorage,
	setObjectAsync,
	getObjectAsync,
} from './storage'

// Network Status
export {
	initNetworkListener,
	getNetworkStatus,
	checkNetworkStatus,
	addNetworkListener,
	useNetworkStatus,
} from './networkStatus'

// Offline Queue
export {
	offlineQueue,
	type OperationType,
	type QueuedOperation,
	type OperationHandler,
} from './offlineQueue'

// Cache Manager
export {
	// Profile
	cacheProfile,
	getCachedProfile,
	// Training Plans
	cacheTrainingPlans,
	getCachedTrainingPlans,
	isTrainingPlansCacheStale,
	// Exercises
	cacheExercises,
	getCachedExercises,
	isExercisesCacheStale,
	// Measurements
	cacheMeasurements,
	getCachedMeasurements,
	addCachedMeasurement,
	// Completed Workouts
	cacheCompletedWorkouts,
	getCachedCompletedWorkouts,
	addCachedCompletedWorkout,
	isWorkoutDayCompletedOffline,
	// Clients
	cacheClients,
	getCachedClients,
	// Clear
	clearUserCache,
	// Types
	type CachedTrainingPlan,
	type CachedWorkoutDay,
	type CachedWorkoutExercise,
	type CachedExercise,
	type CachedCompletedWorkout,
	type CachedCompletedExercise,
	type CachedClient,
	type UserProfile,
} from './cacheManager'

// Offline Sync
export { registerOfflineHandlers } from './offlineSync'

// Offline Data Hooks
export {
	useOfflineActivePlan,
	useOfflinePlanDetails,
	useOfflineCompletedWorkouts,
	useOfflineWorkoutStats,
	useOfflineTodayWorkoutStatus,
	useOfflineMeasurements,
	useOfflineExercises,
	useOfflineSaveWorkout,
	useOfflineSaveMeasurement,
	useOfflinePendingCount,
	useOfflineSync,
} from './useOfflineData'

