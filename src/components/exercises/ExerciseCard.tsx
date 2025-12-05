/**
 * ExerciseCard - Karta ćwiczenia w bibliotece
 *
 * Wyświetla miniaturkę, nazwę, kategorię i grupy mięśniowe.
 */

import React from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActionSheetIOS, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/colors'
import type { Exercise, ExerciseCategory, ExerciseDifficulty, MuscleGroup } from '../../types'

// ============================================
// TYPY
// ============================================

export interface ExerciseCardProps {
	/** Dane ćwiczenia */
	exercise: Exercise
	/** Callback na kliknięcie */
	onPress?: (exercise: Exercise) => void
	/** Callback na długie przytrzymanie */
	onLongPress?: (exercise: Exercise) => void
	/** Callback na edycję */
	onEdit?: (exercise: Exercise) => void
	/** Callback na usunięcie */
	onDelete?: (exercise: Exercise) => void
	/** Callback na podgląd */
	onView?: (exercise: Exercise) => void
	/** Czy pokazać menu akcji */
	showActions?: boolean
}

// ============================================
// MAPOWANIA
// ============================================

/** Nazwy kategorii po polsku */
const categoryLabels: Record<ExerciseCategory, string> = {
	strength: 'Siłowe',
	cardio: 'Cardio',
	stretching: 'Stretching',
	core: 'Core',
	other: 'Inne',
}

/** Kolory kategorii */
const categoryColors: Record<ExerciseCategory, string> = {
	strength: colors.categorySilowe,
	cardio: colors.categoryCardio,
	stretching: colors.categoryStretching,
	core: colors.categoryCore,
	other: colors.textSecondary,
}

/** Nazwy trudności po polsku */
const difficultyLabels: Record<ExerciseDifficulty, string> = {
	easy: 'Łatwe',
	medium: 'Średnie',
	hard: 'Trudne',
}

/** Kolory trudności */
const difficultyColors: Record<ExerciseDifficulty, string> = {
	easy: colors.difficultyEasy,
	medium: colors.difficultyMedium,
	hard: colors.difficultyHard,
}

/** Nazwy grup mięśniowych po polsku */
const muscleGroupLabels: Record<MuscleGroup, string> = {
	chest: 'Klatka',
	back: 'Plecy',
	shoulders: 'Barki',
	biceps: 'Biceps',
	triceps: 'Triceps',
	forearms: 'Przedramiona',
	core: 'Brzuch',
	glutes: 'Pośladki',
	quadriceps: 'Czworogłowe',
	hamstrings: 'Dwugłowe',
	calves: 'Łydki',
	full_body: 'Całe ciało',
}

// ============================================
// KOMPONENT
// ============================================

export default function ExerciseCard({
	exercise,
	onPress,
	onLongPress,
	onEdit,
	onDelete,
	onView,
	showActions = true,
}: ExerciseCardProps) {
	// ============================================
	// HANDLERS
	// ============================================

	/**
	 * Obsługa kliknięcia
	 */
	const handlePress = () => {
		onPress?.(exercise)
	}

	/**
	 * Obsługa długiego przytrzymania - pokaż menu akcji
	 */
	const handleLongPress = () => {
		if (!showActions) {
			onLongPress?.(exercise)
			return
		}

		if (Platform.OS === 'ios') {
			// iOS ActionSheet
			ActionSheetIOS.showActionSheetWithOptions(
				{
					options: ['Anuluj', 'Zobacz szczegóły', 'Edytuj', 'Usuń'],
					destructiveButtonIndex: 3,
					cancelButtonIndex: 0,
					title: exercise.name,
				},
				(buttonIndex) => {
					switch (buttonIndex) {
						case 1:
							onView?.(exercise)
							break
						case 2:
							onEdit?.(exercise)
							break
						case 3:
							confirmDelete()
							break
					}
				}
			)
		} else {
			// Android - prosty Alert
			Alert.alert(
				exercise.name,
				'Wybierz akcję',
				[
					{ text: 'Anuluj', style: 'cancel' },
					{ text: 'Zobacz szczegóły', onPress: () => onView?.(exercise) },
					{ text: 'Edytuj', onPress: () => onEdit?.(exercise) },
					{ text: 'Usuń', onPress: confirmDelete, style: 'destructive' },
				]
			)
		}
	}

	/**
	 * Potwierdź usunięcie
	 */
	const confirmDelete = () => {
		Alert.alert(
			'Usuń ćwiczenie',
			`Czy na pewno chcesz usunąć "${exercise.name}"?`,
			[
				{ text: 'Anuluj', style: 'cancel' },
				{ text: 'Usuń', onPress: () => onDelete?.(exercise), style: 'destructive' },
			]
		)
	}

	// ============================================
	// RENDER
	// ============================================

	// Wybierz maksymalnie 2 grupy mięśniowe do wyświetlenia
	const displayedMuscleGroups = exercise.muscle_groups.slice(0, 2)
	const remainingCount = exercise.muscle_groups.length - 2

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={handlePress}
			onLongPress={handleLongPress}
			activeOpacity={0.7}
			delayLongPress={500}>
			{/* Thumbnail */}
			<View style={styles.thumbnailContainer}>
				{exercise.thumbnail_url ? (
					<Image
						source={{ uri: exercise.thumbnail_url }}
						style={styles.thumbnail}
						resizeMode="cover"
					/>
				) : (
					<View style={styles.thumbnailPlaceholder}>
						<Ionicons name="barbell" size={32} color={colors.textSecondary} />
					</View>
				)}

				{/* Video indicator */}
				{exercise.video_url && (
					<View style={styles.videoIndicator}>
						<Ionicons name="play-circle" size={20} color={colors.textPrimary} />
					</View>
				)}
			</View>

			{/* Info */}
			<View style={styles.infoContainer}>
				{/* Nazwa */}
				<Text style={styles.name} numberOfLines={1}>
					{exercise.name}
				</Text>

				{/* Kategoria i trudność */}
				<View style={styles.badgesRow}>
					{/* Kategoria badge */}
					<View style={[styles.badge, { backgroundColor: categoryColors[exercise.category] }]}>
						<Text style={styles.badgeText}>{categoryLabels[exercise.category]}</Text>
					</View>

					{/* Trudność badge */}
					<View style={[styles.difficultyBadge, { borderColor: difficultyColors[exercise.difficulty] }]}>
						<View style={[styles.difficultyDot, { backgroundColor: difficultyColors[exercise.difficulty] }]} />
						<Text style={[styles.difficultyText, { color: difficultyColors[exercise.difficulty] }]}>
							{difficultyLabels[exercise.difficulty]}
						</Text>
					</View>
				</View>

				{/* Grupy mięśniowe */}
				<View style={styles.muscleGroupsRow}>
					{displayedMuscleGroups.map((group) => (
						<View key={group} style={styles.muscleChip}>
							<Text style={styles.muscleChipText}>{muscleGroupLabels[group]}</Text>
						</View>
					))}
					{remainingCount > 0 && (
						<View style={styles.muscleChip}>
							<Text style={styles.muscleChipText}>+{remainingCount}</Text>
						</View>
					)}
				</View>
			</View>

			{/* Strzałka */}
			<View style={styles.arrowContainer}>
				<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
			</View>
		</TouchableOpacity>
	)
}

// ============================================
// STYLE
// ============================================

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 12,
		marginBottom: 12,
		alignItems: 'center',
	},
	thumbnailContainer: {
		width: 80,
		height: 80,
		borderRadius: 8,
		overflow: 'hidden',
		backgroundColor: colors.background,
		position: 'relative',
	},
	thumbnail: {
		width: '100%',
		height: '100%',
	},
	thumbnailPlaceholder: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
	videoIndicator: {
		position: 'absolute',
		bottom: 4,
		right: 4,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		borderRadius: 10,
		padding: 2,
	},
	infoContainer: {
		flex: 1,
		marginLeft: 12,
		gap: 6,
	},
	name: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	badgesRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	badgeText: {
		fontSize: 11,
		fontWeight: '600',
		color: colors.textOnPrimary,
	},
	difficultyBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
		borderWidth: 1,
		gap: 4,
	},
	difficultyDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	difficultyText: {
		fontSize: 11,
		fontWeight: '500',
	},
	muscleGroupsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 4,
	},
	muscleChip: {
		backgroundColor: colors.background,
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 4,
	},
	muscleChipText: {
		fontSize: 10,
		color: colors.textSecondary,
	},
	arrowContainer: {
		marginLeft: 8,
	},
})

