/**
 * ExerciseDetailScreen - Szczegóły ćwiczenia
 *
 * Wyświetla pełne informacje o ćwiczeniu z video playerem.
 */

import React, { useState } from 'react'
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useExercise, useDeleteExercise, useCheckExerciseUsage } from '../../api/services/exercises'
import VideoPlayer from '../../components/exercises/VideoPlayer'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'
import type { ExerciseCategory, ExerciseDifficulty, MuscleGroup } from '../../types'

// ============================================
// MAPOWANIA
// ============================================

const categoryLabels: Record<ExerciseCategory, string> = {
	strength: 'Siłowe',
	cardio: 'Cardio',
	stretching: 'Stretching',
	core: 'Core',
	other: 'Inne',
}

const difficultyLabels: Record<ExerciseDifficulty, string> = {
	easy: 'Łatwe',
	medium: 'Średnie',
	hard: 'Trudne',
}

const difficultyColors: Record<ExerciseDifficulty, string> = {
	easy: colors.difficultyEasy,
	medium: colors.difficultyMedium,
	hard: colors.difficultyHard,
}

const muscleGroupLabels: Record<MuscleGroup, string> = {
	chest: 'Klatka piersiowa',
	back: 'Plecy',
	shoulders: 'Barki',
	biceps: 'Biceps',
	triceps: 'Triceps',
	forearms: 'Przedramiona',
	core: 'Brzuch',
	glutes: 'Pośladki',
	quadriceps: 'Czworogłowe',
	hamstrings: 'Dwugłowe uda',
	calves: 'Łydki',
	full_body: 'Całe ciało',
}

// ============================================
// KOMPONENT
// ============================================

type ExerciseDetailRouteProp = RouteProp<AppStackParamList, 'ExerciseDetail'>

export default function ExerciseDetailScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const route = useRoute<ExerciseDetailRouteProp>()
	const { exerciseId } = route.params

	const { data: exercise, isLoading } = useExercise(exerciseId)
	const { data: isUsedInPlans } = useCheckExerciseUsage(exerciseId)
	const deleteMutation = useDeleteExercise()

	const [isDeleting, setIsDeleting] = useState(false)

	// ============================================
	// HANDLERS
	// ============================================

	/**
	 * Edytuj ćwiczenie
	 */
	const handleEdit = () => {
		navigation.navigate('EditExercise', { exerciseId })
	}

	/**
	 * Usuń ćwiczenie
	 */
	const handleDelete = () => {
		if (isUsedInPlans) {
			Alert.alert(
				'Nie można usunąć',
				'To ćwiczenie jest używane w planach treningowych. Usuń je najpierw z planów.',
				[{ text: 'OK' }]
			)
			return
		}

		Alert.alert(
			'Usuń ćwiczenie',
			`Czy na pewno chcesz usunąć "${exercise?.name}"?\n\nTa operacja jest nieodwracalna.`,
			[
				{ text: 'Anuluj', style: 'cancel' },
				{
					text: 'Usuń',
					style: 'destructive',
					onPress: async () => {
						setIsDeleting(true)
						try {
							await deleteMutation.mutateAsync(exerciseId)
							navigation.goBack()
						} catch (error: any) {
							Alert.alert('Błąd', error?.message || 'Nie udało się usunąć ćwiczenia')
						} finally {
							setIsDeleting(false)
						}
					},
				},
			]
		)
	}

	/**
	 * Użyj w planie treningowym
	 */
	const handleUseInPlan = () => {
		// TODO: Nawigacja do tworzenia planu z tym ćwiczeniem
		Alert.alert('Użyj w planie', 'Funkcja tworzenia planu (w budowie)')
	}

	// ============================================
	// RENDER - LOADING
	// ============================================

	if (isLoading) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			</SafeAreaView>
		)
	}

	// ============================================
	// RENDER - NOT FOUND
	// ============================================

	if (!exercise) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.header}>
					<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
						<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Szczegóły</Text>
					<View style={{ width: 40 }} />
				</View>
				<View style={styles.notFoundContainer}>
					<Ionicons name="alert-circle" size={64} color={colors.textSecondary} />
					<Text style={styles.notFoundText}>Ćwiczenie nie zostało znalezione</Text>
					<TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
						<Text style={styles.goBackButtonText}>Wróć do biblioteki</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		)
	}

	// ============================================
	// RENDER - MAIN
	// ============================================

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
					<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
				</TouchableOpacity>
				<Text style={styles.headerTitle} numberOfLines={1}>
					{exercise.name}
				</Text>
				<View style={{ width: 40 }} />
			</View>

			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
				{/* Video Player */}
				{exercise.video_url ? (
					<VideoPlayer
						videoUrl={exercise.video_url}
						thumbnailUrl={exercise.thumbnail_url || undefined}
						height={280}
						loop={true}
						showControls={true}
					/>
				) : (
					<View style={styles.noVideoContainer}>
						<Ionicons name="videocam-off" size={48} color={colors.textSecondary} />
						<Text style={styles.noVideoText}>Brak video demonstracyjnego</Text>
					</View>
				)}

				{/* Content */}
				<View style={styles.content}>
					{/* Nazwa */}
					<Text style={styles.exerciseName}>{exercise.name}</Text>

					{/* Badges */}
					<View style={styles.badgesContainer}>
						{/* Kategoria */}
						<View style={[styles.badge, { backgroundColor: colors.primary }]}>
							<Text style={styles.badgeText}>{categoryLabels[exercise.category]}</Text>
						</View>

						{/* Trudność */}
						<View
							style={[
								styles.badge,
								{
									backgroundColor: 'transparent',
									borderWidth: 1,
									borderColor: difficultyColors[exercise.difficulty],
								},
							]}>
							<View
								style={[
									styles.difficultyDot,
									{ backgroundColor: difficultyColors[exercise.difficulty] },
								]}
							/>
							<Text style={[styles.badgeText, { color: difficultyColors[exercise.difficulty] }]}>
								{difficultyLabels[exercise.difficulty]}
							</Text>
						</View>
					</View>

					{/* Grupy mięśniowe */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Grupy mięśniowe</Text>
						<View style={styles.muscleGroupsContainer}>
							{exercise.muscle_groups.map((group) => (
								<View key={group} style={styles.muscleChip}>
									<Text style={styles.muscleChipText}>{muscleGroupLabels[group]}</Text>
								</View>
							))}
						</View>
					</View>

					{/* Parametry */}
					{(exercise.typical_reps || exercise.rest_seconds) && (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Zalecane parametry</Text>
							<View style={styles.paramsContainer}>
								{exercise.typical_reps && (
									<View style={styles.paramItem}>
										<Ionicons name="repeat" size={20} color={colors.primary} />
										<Text style={styles.paramLabel}>Powtórzenia</Text>
										<Text style={styles.paramValue}>{exercise.typical_reps}</Text>
									</View>
								)}
								{exercise.rest_seconds && (
									<View style={styles.paramItem}>
										<Ionicons name="time" size={20} color={colors.primary} />
										<Text style={styles.paramLabel}>Odpoczynek</Text>
										<Text style={styles.paramValue}>{exercise.rest_seconds}s</Text>
									</View>
								)}
							</View>
						</View>
					)}

					{/* Opis */}
					{exercise.description && (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Opis wykonania</Text>
							<Text style={styles.descriptionText}>{exercise.description}</Text>
						</View>
					)}

					{/* Wskazówki */}
					{exercise.tips && (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Wskazówki</Text>
							<View style={styles.tipsContainer}>
								<Ionicons name="bulb" size={20} color={colors.warning} />
								<Text style={styles.tipsText}>{exercise.tips}</Text>
							</View>
						</View>
					)}

					{/* Ostrzeżenie jeśli używane w planach */}
					{isUsedInPlans && (
						<View style={styles.warningBox}>
							<Ionicons name="information-circle" size={20} color={colors.info} />
							<Text style={styles.warningText}>
								To ćwiczenie jest używane w planach treningowych
							</Text>
						</View>
					)}

					{/* Spacer dla przycisków */}
					<View style={{ height: 100 }} />
				</View>
			</ScrollView>

			{/* Action buttons */}
			<View style={styles.actionsContainer}>
				<TouchableOpacity
					style={[styles.actionButton, styles.useButton]}
					onPress={handleUseInPlan}
					activeOpacity={0.8}>
					<Ionicons name="add-circle" size={20} color={colors.textOnPrimary} />
					<Text style={styles.actionButtonText}>Użyj w planie</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.actionButton, styles.editButton]}
					onPress={handleEdit}
					activeOpacity={0.8}>
					<Ionicons name="pencil" size={20} color={colors.textPrimary} />
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.actionButton, styles.deleteButton]}
					onPress={handleDelete}
					disabled={isDeleting}
					activeOpacity={0.8}>
					{isDeleting ? (
						<ActivityIndicator size="small" color={colors.textOnPrimary} />
					) : (
						<Ionicons name="trash" size={20} color={colors.textOnPrimary} />
					)}
				</TouchableOpacity>
			</View>
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
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	backButton: {
		padding: 8,
	},
	headerTitle: {
		flex: 1,
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
		textAlign: 'center',
		marginHorizontal: 8,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	notFoundContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 40,
	},
	notFoundText: {
		color: colors.textSecondary,
		fontSize: 16,
		marginTop: 16,
		textAlign: 'center',
	},
	goBackButton: {
		marginTop: 24,
		paddingHorizontal: 20,
		paddingVertical: 12,
		backgroundColor: colors.primary,
		borderRadius: 8,
	},
	goBackButtonText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
	},
	scrollView: {
		flex: 1,
	},
	noVideoContainer: {
		height: 200,
		backgroundColor: colors.surface,
		justifyContent: 'center',
		alignItems: 'center',
	},
	noVideoText: {
		color: colors.textSecondary,
		marginTop: 8,
	},
	content: {
		padding: 20,
	},
	exerciseName: {
		fontSize: 28,
		fontWeight: 'bold',
		color: colors.textPrimary,
		marginBottom: 16,
	},
	badgesContainer: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 24,
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		gap: 6,
	},
	badgeText: {
		color: colors.textOnPrimary,
		fontSize: 13,
		fontWeight: '600',
	},
	difficultyDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
		marginBottom: 12,
	},
	muscleGroupsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	muscleChip: {
		backgroundColor: colors.surface,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
	},
	muscleChipText: {
		color: colors.textSecondary,
		fontSize: 14,
	},
	paramsContainer: {
		flexDirection: 'row',
		gap: 16,
	},
	paramItem: {
		flex: 1,
		backgroundColor: colors.surface,
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		gap: 8,
	},
	paramLabel: {
		color: colors.textSecondary,
		fontSize: 12,
	},
	paramValue: {
		color: colors.textPrimary,
		fontSize: 18,
		fontWeight: '600',
	},
	descriptionText: {
		color: colors.textSecondary,
		fontSize: 15,
		lineHeight: 24,
	},
	tipsContainer: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		padding: 16,
		borderRadius: 12,
		gap: 12,
	},
	tipsText: {
		flex: 1,
		color: colors.textSecondary,
		fontSize: 14,
		lineHeight: 22,
	},
	warningBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		padding: 12,
		borderRadius: 8,
		gap: 8,
		marginTop: 8,
	},
	warningText: {
		color: colors.textSecondary,
		fontSize: 13,
		flex: 1,
	},
	actionsContainer: {
		flexDirection: 'row',
		padding: 16,
		paddingBottom: 32,
		gap: 12,
		backgroundColor: colors.background,
		borderTopWidth: 1,
		borderTopColor: colors.border,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 14,
		borderRadius: 12,
		gap: 8,
	},
	useButton: {
		flex: 1,
		backgroundColor: colors.primary,
	},
	editButton: {
		width: 52,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	deleteButton: {
		width: 52,
		backgroundColor: colors.error,
	},
	actionButtonText: {
		color: colors.textOnPrimary,
		fontSize: 16,
		fontWeight: '600',
	},
})

