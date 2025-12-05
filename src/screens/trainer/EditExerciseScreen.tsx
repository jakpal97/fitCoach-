/**
 * EditExerciseScreen - Edycja ćwiczenia
 *
 * Formularz do edycji istniejącego ćwiczenia.
 * Podobny do AddExerciseScreen, ale z załadowanymi danymi.
 */

import React, { useState, useEffect } from 'react'
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	Alert,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { useExercise, useUpdateExercise } from '../../api/services/exercises'
import { exerciseSchema, type ExerciseFormData } from '../../utils/validation'
import { colors } from '../../theme/colors'
import {
	generateThumbnail,
	uploadVideoToSupabase,
	uploadThumbnailToSupabase,
	generateExerciseMediaPath,
	deleteVideoFromSupabase,
	isVideoSizeValid,
} from '../../utils/videoCompression'
import type { AppStackParamList } from '../../navigation/AppNavigator'
import type { ExerciseCategory, ExerciseDifficulty, MuscleGroup } from '../../types'

// ============================================
// MAPOWANIA
// ============================================

const CATEGORIES: { key: ExerciseCategory; label: string }[] = [
	{ key: 'strength', label: 'Siłowe' },
	{ key: 'cardio', label: 'Cardio' },
	{ key: 'stretching', label: 'Stretching' },
	{ key: 'core', label: 'Core' },
	{ key: 'other', label: 'Inne' },
]

const DIFFICULTIES: { key: ExerciseDifficulty; label: string; color: string }[] = [
	{ key: 'easy', label: 'Łatwe', color: colors.difficultyEasy },
	{ key: 'medium', label: 'Średnie', color: colors.difficultyMedium },
	{ key: 'hard', label: 'Trudne', color: colors.difficultyHard },
]

const MUSCLE_GROUPS: { key: MuscleGroup; label: string }[] = [
	{ key: 'chest', label: 'Klatka' },
	{ key: 'back', label: 'Plecy' },
	{ key: 'shoulders', label: 'Barki' },
	{ key: 'biceps', label: 'Biceps' },
	{ key: 'triceps', label: 'Triceps' },
	{ key: 'forearms', label: 'Przedramiona' },
	{ key: 'core', label: 'Brzuch' },
	{ key: 'glutes', label: 'Pośladki' },
	{ key: 'quadriceps', label: 'Uda przód' },
	{ key: 'hamstrings', label: 'Uda tył' },
	{ key: 'calves', label: 'Łydki' },
	{ key: 'full_body', label: 'Całe ciało' },
]

// ============================================
// KOMPONENT
// ============================================

type EditExerciseRouteProp = RouteProp<AppStackParamList, 'EditExercise'>

export default function EditExerciseScreen() {
	const navigation = useNavigation()
	const route = useRoute<EditExerciseRouteProp>()
	const { exerciseId } = route.params

	// Pobierz dane ćwiczenia
	const { data: exercise, isLoading: isLoadingExercise } = useExercise(exerciseId)
	const updateMutation = useUpdateExercise()

	const [isSubmitting, setIsSubmitting] = useState(false)

	// Stan video
	const [videoUri, setVideoUri] = useState<string | null>(null)
	const [thumbnailUri, setThumbnailUri] = useState<string | null>(null)
	const [isUploadingVideo, setIsUploadingVideo] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [videoChanged, setVideoChanged] = useState(false)

	// React Hook Form
	const {
		control,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors, isValid },
	} = useForm<ExerciseFormData>({
		resolver: zodResolver(exerciseSchema),
		mode: 'onChange',
		defaultValues: {
			name: '',
			category: 'strength',
			muscle_groups: [],
			difficulty: 'medium',
			description: '',
			tips: '',
			typical_reps: '',
			rest_seconds: 60,
		},
	})

	// Załaduj dane ćwiczenia do formularza
	useEffect(() => {
		if (exercise) {
			reset({
				name: exercise.name,
				category: exercise.category,
				muscle_groups: exercise.muscle_groups,
				difficulty: exercise.difficulty,
				description: exercise.description || '',
				tips: exercise.tips || '',
				typical_reps: exercise.typical_reps || '',
				rest_seconds: exercise.rest_seconds || 60,
			})
			// Załaduj istniejące video/thumbnail
			if (exercise.video_url) {
				setVideoUri(exercise.video_url)
			}
			if (exercise.thumbnail_url) {
				setThumbnailUri(exercise.thumbnail_url)
			}
		}
	}, [exercise, reset])

	const selectedMuscleGroups = watch('muscle_groups')
	const restSeconds = watch('rest_seconds')

	// ============================================
	// HANDLERS
	// ============================================

	/**
	 * Toggle grupy mięśniowej
	 */
	const toggleMuscleGroup = (group: MuscleGroup) => {
		const current = selectedMuscleGroups
		if (current.includes(group)) {
			setValue(
				'muscle_groups',
				current.filter((g) => g !== group),
				{ shouldValidate: true }
			)
		} else {
			setValue('muscle_groups', [...current, group], { shouldValidate: true })
		}
	}

	/**
	 * Wybierz video z galerii
	 */
	const pickVideoFromGallery = async () => {
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ['videos'],
				allowsEditing: true,
				quality: 0.8,
				videoMaxDuration: 120,
			})

			if (!result.canceled && result.assets[0]) {
				await processSelectedVideo(result.assets[0].uri)
			}
		} catch (error) {
			Alert.alert('Błąd', 'Nie udało się wybrać video')
		}
	}

	/**
	 * Nagraj video kamerą
	 */
	const recordVideo = async () => {
		try {
			const { status } = await ImagePicker.requestCameraPermissionsAsync()
			if (status !== 'granted') {
				Alert.alert('Brak uprawnień', 'Potrzebujemy dostępu do kamery')
				return
			}

			const result = await ImagePicker.launchCameraAsync({
				mediaTypes: ['videos'],
				allowsEditing: true,
				quality: 0.8,
				videoMaxDuration: 120,
			})

			if (!result.canceled && result.assets[0]) {
				await processSelectedVideo(result.assets[0].uri)
			}
		} catch (error) {
			Alert.alert('Błąd', 'Nie udało się nagrać video')
		}
	}

	/**
	 * Przetwórz wybrane video
	 */
	const processSelectedVideo = async (uri: string) => {
		try {
			const isValid = await isVideoSizeValid(uri, 100)
			if (!isValid) {
				Alert.alert('Błąd', 'Plik video jest za duży (max 100MB)')
				return
			}

			setVideoUri(uri)
			setVideoChanged(true)

			const thumbnail = await generateThumbnail(uri, 1000)
			setThumbnailUri(thumbnail)
		} catch (error) {
			console.error('Błąd przetwarzania video:', error)
			Alert.alert('Błąd', 'Nie udało się przetworzyć video')
		}
	}

	/**
	 * Usuń video
	 */
	const removeVideo = () => {
		setVideoUri(null)
		setThumbnailUri(null)
		setVideoChanged(true)
	}

	/**
	 * Zapisz zmiany
	 */
	const onSubmit = async (data: ExerciseFormData) => {
		if (!exercise) return

		setIsSubmitting(true)

		try {
			let videoUrl: string | undefined = exercise.video_url || undefined
			let thumbnailUrl: string | undefined = exercise.thumbnail_url || undefined

			// Jeśli video się zmieniło
			if (videoChanged) {
				// Usuń stare video jeśli istniało
				if (exercise.video_url) {
					await deleteVideoFromSupabase(exercise.video_url)
				}

				// Upload nowego video jeśli wybrano
				if (videoUri && !videoUri.startsWith('http')) {
					setIsUploadingVideo(true)

					const videoPath = generateExerciseMediaPath(
						exercise.trainer_id,
						exercise.id,
						true
					)
					const videoResult = await uploadVideoToSupabase(videoUri, videoPath, (progress) => {
						setUploadProgress(progress.progress)
					})
					videoUrl = videoResult.publicUrl

					if (thumbnailUri && !thumbnailUri.startsWith('http')) {
						const thumbPath = generateExerciseMediaPath(
							exercise.trainer_id,
							exercise.id,
							false
						)
						thumbnailUrl = await uploadThumbnailToSupabase(thumbnailUri, thumbPath)
					}

					setIsUploadingVideo(false)
				} else if (!videoUri) {
					// Video zostało usunięte
					videoUrl = undefined
					thumbnailUrl = undefined
				}
			}

			// Aktualizuj ćwiczenie
			await updateMutation.mutateAsync({
				id: exercise.id,
				data: {
					name: data.name,
					category: data.category,
					muscle_groups: data.muscle_groups,
					difficulty: data.difficulty,
					description: data.description || undefined,
					tips: data.tips || undefined,
					typical_reps: data.typical_reps || undefined,
					rest_seconds: data.rest_seconds || undefined,
					video_url: videoUrl,
					thumbnail_url: thumbnailUrl,
				},
			})

			Alert.alert('Sukces', 'Ćwiczenie zostało zaktualizowane!', [
				{ text: 'OK', onPress: () => navigation.goBack() },
			])
		} catch (error: any) {
			Alert.alert('Błąd', error?.message || 'Nie udało się zaktualizować ćwiczenia')
		} finally {
			setIsSubmitting(false)
			setIsUploadingVideo(false)
		}
	}

	// ============================================
	// RENDER - LOADING
	// ============================================

	if (isLoadingExercise) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={styles.loadingText}>Ładowanie ćwiczenia...</Text>
				</View>
			</SafeAreaView>
		)
	}

	if (!exercise) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Nie znaleziono ćwiczenia</Text>
					<TouchableOpacity onPress={() => navigation.goBack()}>
						<Text style={styles.backLink}>Wróć</Text>
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
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
					<Ionicons name="close" size={28} color={colors.textPrimary} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Edytuj ćwiczenie</Text>
				<View style={{ width: 40 }} />
			</View>

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
					{/* Nazwa */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Nazwa ćwiczenia *</Text>
						<Controller
							control={control}
							name="name"
							render={({ field: { onChange, onBlur, value } }) => (
								<TextInput
									style={[styles.input, errors.name && styles.inputError]}
									placeholder="np. Wyciskanie sztangi"
									placeholderTextColor={colors.textSecondary}
									value={value}
									onChangeText={onChange}
									onBlur={onBlur}
								/>
							)}
						/>
						{errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
					</View>

					{/* Kategoria */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Kategoria *</Text>
						<Controller
							control={control}
							name="category"
							render={({ field: { value, onChange } }) => (
								<View style={styles.categoryContainer}>
									{CATEGORIES.map((cat) => (
										<TouchableOpacity
											key={cat.key}
											style={[
												styles.categoryButton,
												value === cat.key && styles.categoryButtonActive,
											]}
											onPress={() => onChange(cat.key)}>
											<Text
												style={[
													styles.categoryButtonText,
													value === cat.key && styles.categoryButtonTextActive,
												]}>
												{cat.label}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							)}
						/>
					</View>

					{/* Trudność */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Trudność *</Text>
						<Controller
							control={control}
							name="difficulty"
							render={({ field: { value, onChange } }) => (
								<View style={styles.difficultyContainer}>
									{DIFFICULTIES.map((diff) => (
										<TouchableOpacity
											key={diff.key}
											style={[
												styles.difficultyButton,
												value === diff.key && {
													borderColor: diff.color,
													backgroundColor: diff.color + '20',
												},
											]}
											onPress={() => onChange(diff.key)}>
											<View
												style={[styles.difficultyDot, { backgroundColor: diff.color }]}
											/>
											<Text
												style={[
													styles.difficultyButtonText,
													value === diff.key && { color: diff.color },
												]}>
												{diff.label}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							)}
						/>
					</View>

					{/* Grupy mięśniowe */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Grupy mięśniowe *</Text>
						<View style={styles.muscleGroupsContainer}>
							{MUSCLE_GROUPS.map((group) => {
								const isSelected = selectedMuscleGroups.includes(group.key)
								return (
									<TouchableOpacity
										key={group.key}
										style={[
											styles.muscleChip,
											isSelected && styles.muscleChipSelected,
										]}
										onPress={() => toggleMuscleGroup(group.key)}>
										<Text
											style={[
												styles.muscleChipText,
												isSelected && styles.muscleChipTextSelected,
											]}>
											{group.label}
										</Text>
									</TouchableOpacity>
								)
							})}
						</View>
						{errors.muscle_groups && (
							<Text style={styles.errorText}>{errors.muscle_groups.message}</Text>
						)}
					</View>

					{/* Sekcja video */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Film demonstracyjny</Text>

						{videoUri ? (
							<View style={styles.videoPreviewContainer}>
								{thumbnailUri && (
									<Image
										source={{ uri: thumbnailUri }}
										style={styles.videoThumbnail}
										resizeMode="cover"
									/>
								)}
								<View style={styles.videoOverlay}>
									<Ionicons name="play-circle" size={48} color={colors.textPrimary} />
								</View>
								<TouchableOpacity style={styles.removeVideoButton} onPress={removeVideo}>
									<Ionicons name="close" size={20} color={colors.textPrimary} />
								</TouchableOpacity>
								{videoChanged && (
									<View style={styles.videoBadge}>
										<Text style={styles.videoBadgeText}>Nowe</Text>
									</View>
								)}
							</View>
						) : (
							<View style={styles.videoButtonsContainer}>
								<TouchableOpacity style={styles.videoButton} onPress={recordVideo}>
									<Ionicons name="videocam" size={24} color={colors.primary} />
									<Text style={styles.videoButtonText}>Nagraj film</Text>
								</TouchableOpacity>
								<TouchableOpacity style={styles.videoButton} onPress={pickVideoFromGallery}>
									<Ionicons name="images" size={24} color={colors.primary} />
									<Text style={styles.videoButtonText}>Wybierz z galerii</Text>
								</TouchableOpacity>
							</View>
						)}

						{isUploadingVideo && (
							<View style={styles.uploadProgressContainer}>
								<View style={styles.uploadProgressBar}>
									<View style={[styles.uploadProgressFill, { width: `${uploadProgress}%` }]} />
								</View>
								<Text style={styles.uploadProgressText}>
									Przesyłanie... {Math.round(uploadProgress)}%
								</Text>
							</View>
						)}
					</View>

					{/* Opis */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Opis wykonania</Text>
						<Controller
							control={control}
							name="description"
							render={({ field: { onChange, onBlur, value } }) => (
								<TextInput
									style={[styles.input, styles.textArea]}
									placeholder="Opisz jak prawidłowo wykonać ćwiczenie..."
									placeholderTextColor={colors.textSecondary}
									value={value}
									onChangeText={onChange}
									onBlur={onBlur}
									multiline
									numberOfLines={4}
									textAlignVertical="top"
								/>
							)}
						/>
					</View>

					{/* Wskazówki */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Wskazówki</Text>
						<Controller
							control={control}
							name="tips"
							render={({ field: { onChange, onBlur, value } }) => (
								<TextInput
									style={[styles.input, styles.textArea]}
									placeholder="Dodaj wskazówki dla klienta..."
									placeholderTextColor={colors.textSecondary}
									value={value}
									onChangeText={onChange}
									onBlur={onBlur}
									multiline
									numberOfLines={3}
									textAlignVertical="top"
								/>
							)}
						/>
					</View>

					{/* Typowe powtórzenia */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Typowe powtórzenia (sugestia)</Text>
						<Controller
							control={control}
							name="typical_reps"
							render={({ field: { onChange, onBlur, value } }) => (
								<TextInput
									style={styles.input}
									placeholder="np. 8-12 lub 10"
									placeholderTextColor={colors.textSecondary}
									value={value}
									onChangeText={onChange}
									onBlur={onBlur}
								/>
							)}
						/>
					</View>

					{/* Czas odpoczynku */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Czas odpoczynku (sugestia): {restSeconds}s</Text>
						<View style={styles.restContainer}>
							<TouchableOpacity
								style={styles.restButton}
								onPress={() => setValue('rest_seconds', Math.max(0, restSeconds - 15))}>
								<Ionicons name="remove" size={24} color={colors.primary} />
							</TouchableOpacity>
							<View style={styles.restValue}>
								<Text style={styles.restValueText}>{restSeconds}s</Text>
							</View>
							<TouchableOpacity
								style={styles.restButton}
								onPress={() => setValue('rest_seconds', restSeconds + 15)}>
								<Ionicons name="add" size={24} color={colors.primary} />
							</TouchableOpacity>
						</View>
					</View>

					{/* Spacer */}
					<View style={{ height: 100 }} />
				</ScrollView>
			</KeyboardAvoidingView>

			{/* Submit button */}
			<View style={styles.submitContainer}>
				<TouchableOpacity
					style={[styles.submitButton, (!isValid || isSubmitting) && styles.submitButtonDisabled]}
					onPress={handleSubmit(onSubmit)}
					disabled={!isValid || isSubmitting}
					activeOpacity={0.8}>
					{isSubmitting ? (
						<ActivityIndicator color={colors.textOnPrimary} />
					) : (
						<>
							<Ionicons name="checkmark" size={20} color={colors.textOnPrimary} />
							<Text style={styles.submitButtonText}>Zapisz zmiany</Text>
						</>
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
	closeButton: {
		padding: 4,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		color: colors.textSecondary,
		marginTop: 12,
	},
	backLink: {
		color: colors.primary,
		marginTop: 16,
		fontSize: 16,
	},
	scrollView: {
		flex: 1,
		padding: 20,
	},
	formGroup: {
		marginBottom: 24,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.textPrimary,
		marginBottom: 8,
	},
	input: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 12,
		padding: 14,
		fontSize: 16,
		color: colors.textPrimary,
	},
	inputError: {
		borderColor: colors.error,
	},
	textArea: {
		minHeight: 100,
		paddingTop: 14,
	},
	errorText: {
		color: colors.error,
		fontSize: 12,
		marginTop: 4,
	},
	categoryContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	categoryButton: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	categoryButtonActive: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	categoryButtonText: {
		color: colors.textSecondary,
		fontSize: 14,
		fontWeight: '500',
	},
	categoryButtonTextActive: {
		color: colors.textOnPrimary,
	},
	difficultyContainer: {
		flexDirection: 'row',
		gap: 12,
	},
	difficultyButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		borderRadius: 8,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		gap: 6,
	},
	difficultyDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	difficultyButtonText: {
		color: colors.textSecondary,
		fontSize: 13,
		fontWeight: '500',
	},
	muscleGroupsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	muscleChip: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	muscleChipSelected: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	muscleChipText: {
		color: colors.textSecondary,
		fontSize: 13,
	},
	muscleChipTextSelected: {
		color: colors.textOnPrimary,
	},
	videoButtonsContainer: {
		flexDirection: 'row',
		gap: 12,
	},
	videoButton: {
		flex: 1,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 12,
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	videoButtonText: {
		color: colors.textSecondary,
		fontSize: 13,
		fontWeight: '500',
	},
	videoPreviewContainer: {
		position: 'relative',
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: colors.surface,
	},
	videoThumbnail: {
		width: '100%',
		height: 200,
	},
	videoOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.3)',
	},
	removeVideoButton: {
		position: 'absolute',
		top: 8,
		right: 8,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	videoBadge: {
		position: 'absolute',
		bottom: 8,
		left: 8,
		backgroundColor: colors.primary,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	videoBadgeText: {
		color: colors.textOnPrimary,
		fontSize: 11,
		fontWeight: '600',
	},
	uploadProgressContainer: {
		marginTop: 12,
	},
	uploadProgressBar: {
		height: 4,
		backgroundColor: colors.border,
		borderRadius: 2,
		overflow: 'hidden',
	},
	uploadProgressFill: {
		height: '100%',
		backgroundColor: colors.primary,
	},
	uploadProgressText: {
		color: colors.textSecondary,
		fontSize: 12,
		marginTop: 4,
		textAlign: 'center',
	},
	restContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
	},
	restButton: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		justifyContent: 'center',
		alignItems: 'center',
	},
	restValue: {
		flex: 1,
		alignItems: 'center',
	},
	restValueText: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.textPrimary,
	},
	submitContainer: {
		padding: 20,
		paddingBottom: 32,
		borderTopWidth: 1,
		borderTopColor: colors.border,
	},
	submitButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.primary,
		paddingVertical: 16,
		borderRadius: 12,
		gap: 8,
	},
	submitButtonDisabled: {
		opacity: 0.5,
	},
	submitButtonText: {
		color: colors.textOnPrimary,
		fontSize: 16,
		fontWeight: '600',
	},
})

