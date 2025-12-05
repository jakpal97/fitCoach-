/**
 * ExerciseLibraryScreen - Biblioteka ćwiczeń trenera
 *
 * Lista wszystkich ćwiczeń z wyszukiwaniem i filtrami.
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
	View,
	Text,
	TextInput,
	FlatList,
	TouchableOpacity,
	RefreshControl,
	StyleSheet,
	ActivityIndicator,
	Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useExercises, useDeleteExercise } from '../../api/services/exercises'
import type { AppStackParamList } from '../../navigation/AppNavigator'
import ExerciseCard from '../../components/exercises/ExerciseCard'
import { colors } from '../../theme/colors'
import type { Exercise, ExerciseCategory } from '../../types'

// ============================================
// TYPY
// ============================================

type FilterOption = 'all' | ExerciseCategory

interface FilterChip {
	key: FilterOption
	label: string
}

// ============================================
// STAŁE
// ============================================

const FILTER_CHIPS: FilterChip[] = [
	{ key: 'all', label: 'Wszystkie' },
	{ key: 'strength', label: 'Siłowe' },
	{ key: 'cardio', label: 'Cardio' },
	{ key: 'stretching', label: 'Stretching' },
	{ key: 'core', label: 'Core' },
]

// ============================================
// KOMPONENT
// ============================================

export default function ExerciseLibraryScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	
	// Stan
	const [searchQuery, setSearchQuery] = useState('')
	const [activeFilter, setActiveFilter] = useState<FilterOption>('all')
	const [isSearchFocused, setIsSearchFocused] = useState(false)

	// Przygotuj filtry dla API
	const filters = useMemo(() => {
		const f: { search?: string; category?: ExerciseCategory } = {}
		if (searchQuery.trim()) {
			f.search = searchQuery.trim()
		}
		if (activeFilter !== 'all') {
			f.category = activeFilter
		}
		return Object.keys(f).length > 0 ? f : undefined
	}, [searchQuery, activeFilter])

	// Pobierz ćwiczenia
	const { data: exercises, isLoading, isRefetching, refetch } = useExercises(filters)
	const deleteMutation = useDeleteExercise()

	// ============================================
	// HANDLERS
	// ============================================

	/**
	 * Obsługa kliknięcia na ćwiczenie
	 */
	const handleExercisePress = useCallback((exercise: Exercise) => {
		navigation.navigate('ExerciseDetail', { exerciseId: exercise.id })
	}, [navigation])

	/**
	 * Obsługa edycji
	 */
	const handleEdit = useCallback((exercise: Exercise) => {
		navigation.navigate('EditExercise', { exerciseId: exercise.id })
	}, [navigation])

	/**
	 * Obsługa usunięcia
	 */
	const handleDelete = useCallback(
		(exercise: Exercise) => {
			deleteMutation.mutate(exercise.id, {
				onSuccess: () => {
					Alert.alert('Sukces', 'Ćwiczenie zostało usunięte')
				},
				onError: (error: any) => {
					Alert.alert('Błąd', error?.message || 'Nie udało się usunąć ćwiczenia')
				},
			})
		},
		[deleteMutation]
	)

	/**
	 * Obsługa podglądu
	 */
	const handleView = useCallback((exercise: Exercise) => {
		handleExercisePress(exercise)
	}, [handleExercisePress])

	/**
	 * Obsługa FAB - dodaj ćwiczenie
	 */
	const handleAddExercise = useCallback(() => {
		navigation.navigate('AddExercise')
	}, [navigation])

	/**
	 * Render pojedynczego ćwiczenia
	 */
	const renderExercise = useCallback(
		({ item }: { item: Exercise }) => (
			<ExerciseCard
				exercise={item}
				onPress={handleExercisePress}
				onEdit={handleEdit}
				onDelete={handleDelete}
				onView={handleView}
			/>
		),
		[handleExercisePress, handleEdit, handleDelete, handleView]
	)

	/**
	 * Key extractor dla FlatList
	 */
	const keyExtractor = useCallback((item: Exercise) => item.id, [])

	// ============================================
	// RENDER - SKELETON LOADER
	// ============================================

	const renderSkeleton = () => (
		<View style={styles.skeletonContainer}>
			{[1, 2, 3, 4, 5].map((i) => (
				<View key={i} style={styles.skeletonCard}>
					<View style={styles.skeletonThumbnail} />
					<View style={styles.skeletonInfo}>
						<View style={styles.skeletonTitle} />
						<View style={styles.skeletonBadges} />
						<View style={styles.skeletonChips} />
					</View>
				</View>
			))}
		</View>
	)

	// ============================================
	// RENDER - EMPTY STATE
	// ============================================

	const renderEmpty = () => {
		if (isLoading) return null

		const hasFilters = searchQuery || activeFilter !== 'all'

		return (
			<View style={styles.emptyContainer}>
				<Ionicons
					name={hasFilters ? 'search' : 'barbell-outline'}
					size={64}
					color={colors.textSecondary}
				/>
				<Text style={styles.emptyTitle}>
					{hasFilters ? 'Brak wyników' : 'Brak ćwiczeń'}
				</Text>
				<Text style={styles.emptySubtitle}>
					{hasFilters
						? 'Spróbuj zmienić filtry lub wyszukiwanie'
						: 'Dodaj pierwsze ćwiczenie do biblioteki!'}
				</Text>
				{!hasFilters && (
					<TouchableOpacity style={styles.emptyButton} onPress={handleAddExercise}>
						<Ionicons name="add" size={20} color={colors.textOnPrimary} />
						<Text style={styles.emptyButtonText}>Dodaj ćwiczenie</Text>
					</TouchableOpacity>
				)}
			</View>
		)
	}

	// ============================================
	// RENDER - MAIN
	// ============================================

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.title}>Biblioteka ćwiczeń</Text>
			</View>

			{/* Search bar */}
			<View style={styles.searchContainer}>
				<View
					style={[
						styles.searchInputContainer,
						isSearchFocused && styles.searchInputFocused,
					]}>
					<Ionicons name="search" size={20} color={colors.textSecondary} />
					<TextInput
						style={styles.searchInput}
						placeholder="Szukaj ćwiczeń..."
						placeholderTextColor={colors.textDisabled}
						value={searchQuery}
						onChangeText={setSearchQuery}
						onFocus={() => setIsSearchFocused(true)}
						onBlur={() => setIsSearchFocused(false)}
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity onPress={() => setSearchQuery('')}>
							<Ionicons name="close-circle" size={20} color={colors.textSecondary} />
						</TouchableOpacity>
					)}
				</View>
			</View>

			{/* Filter chips */}
			<View style={styles.filtersContainer}>
				<FlatList
					horizontal
					data={FILTER_CHIPS}
					keyExtractor={(item) => item.key}
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.filtersList}
					renderItem={({ item }) => (
						<TouchableOpacity
							style={[
								styles.filterChip,
								activeFilter === item.key && styles.filterChipActive,
							]}
							onPress={() => setActiveFilter(item.key)}>
							<Text
								style={[
									styles.filterChipText,
									activeFilter === item.key && styles.filterChipTextActive,
								]}>
								{item.label}
							</Text>
						</TouchableOpacity>
					)}
				/>
			</View>

			{/* Lista ćwiczeń */}
			{isLoading && !isRefetching ? (
				renderSkeleton()
			) : (
				<FlatList
					data={exercises || []}
					renderItem={renderExercise}
					keyExtractor={keyExtractor}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={renderEmpty}
					refreshControl={
						<RefreshControl
							refreshing={isRefetching}
							onRefresh={refetch}
							tintColor={colors.primary}
							colors={[colors.primary]}
						/>
					}
					showsVerticalScrollIndicator={false}
				/>
			)}

			{/* FAB - Dodaj ćwiczenie */}
			<TouchableOpacity style={styles.fab} onPress={handleAddExercise} activeOpacity={0.8}>
				<Ionicons name="add" size={28} color={colors.textOnPrimary} />
			</TouchableOpacity>

			{/* Loading overlay dla usuwania */}
			{deleteMutation.isPending && (
				<View style={styles.loadingOverlay}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
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
		paddingHorizontal: 20,
		paddingTop: 8,
		paddingBottom: 16,
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		color: colors.textPrimary,
	},
	searchContainer: {
		paddingHorizontal: 20,
		marginBottom: 12,
	},
	searchInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderWidth: 2,
		borderColor: 'transparent',
		gap: 8,
	},
	searchInputFocused: {
		borderColor: colors.primary,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: colors.textPrimary,
	},
	filtersContainer: {
		marginBottom: 12,
	},
	filtersList: {
		paddingHorizontal: 20,
		gap: 8,
	},
	filterChip: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: colors.surface,
		marginRight: 8,
	},
	filterChipActive: {
		backgroundColor: colors.primary,
	},
	filterChipText: {
		fontSize: 14,
		color: colors.textSecondary,
		fontWeight: '500',
	},
	filterChipTextActive: {
		color: colors.textOnPrimary,
	},
	listContent: {
		paddingHorizontal: 20,
		paddingBottom: 100,
	},
	fab: {
		position: 'absolute',
		bottom: 24,
		right: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingTop: 60,
		paddingHorizontal: 40,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: colors.textPrimary,
		marginTop: 16,
	},
	emptySubtitle: {
		fontSize: 14,
		color: colors.textSecondary,
		textAlign: 'center',
		marginTop: 8,
	},
	emptyButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.primary,
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 8,
		marginTop: 24,
		gap: 8,
	},
	emptyButtonText: {
		color: colors.textOnPrimary,
		fontSize: 16,
		fontWeight: '600',
	},
	skeletonContainer: {
		paddingHorizontal: 20,
	},
	skeletonCard: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 12,
		marginBottom: 12,
	},
	skeletonThumbnail: {
		width: 80,
		height: 80,
		borderRadius: 8,
		backgroundColor: colors.background,
	},
	skeletonInfo: {
		flex: 1,
		marginLeft: 12,
		gap: 8,
	},
	skeletonTitle: {
		width: '70%',
		height: 16,
		borderRadius: 4,
		backgroundColor: colors.background,
	},
	skeletonBadges: {
		width: '50%',
		height: 20,
		borderRadius: 4,
		backgroundColor: colors.background,
	},
	skeletonChips: {
		width: '40%',
		height: 16,
		borderRadius: 4,
		backgroundColor: colors.background,
	},
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
})

