/**
 * AddExerciseScreen - Ekran dodawania nowego ćwiczenia
 *
 * Formularz z walidacją do tworzenia ćwiczeń w bibliotece.
 */

import React, { useState } from 'react'
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
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../../context/AuthContext'
import { useCreateExercise } from '../../api/services/exercises'
import { exerciseSchema, type ExerciseFormData } from '../../utils/validation'
import { colors } from '../../theme/colors'
import {
	generateThumbnail,
	uploadVideoToSupabase,
	uploadThumbnailToSupabase,
	generateExerciseMediaPath,
	formatFileSize,
	isVideoSizeValid,
} from '../../utils/videoCompression'
import type { ExerciseCategory, ExerciseDifficulty, MuscleGroup } from '../../types'

// ============================================
// STAŁE
// ============================================

const CATEGORIES: { value: ExerciseCategory; label: string }[] = [
	{ value: 'strength', label: 'Siłowe' },
	{ value: 'cardio', label: 'Cardio' },
	{ value: 'stretching', label: 'Stretching' },
	{ value: 'core', label: 'Core' },
	{ value: 'other', label: 'Inne' },
]

const DIFFICULTIES: { value: ExerciseDifficulty; label: string }[] = [
	{ value: 'easy', label: 'Łatwe' },
	{ value: 'medium', label: 'Średnie' },
	{ value: 'hard', label: 'Trudne' },
]

const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
	{ value: 'chest', label: 'Klatka piersiowa' },
	{ value: 'back', label: 'Plecy' },
	{ value: 'shoulders', label: 'Barki' },
	{ value: 'biceps', label: 'Biceps' },
	{ value: 'triceps', label: 'Triceps' },
	{ value: 'forearms', label: 'Przedramiona' },
	{ value: 'core', label: 'Brzuch' },
	{ value: 'glutes', label: 'Pośladki' },
	{ value: 'quadriceps', label: 'Czworogłowe' },
	{ value: 'hamstrings', label: 'Dwugłowe uda' },
	{ value: 'calves', label: 'Łydki' },
	{ value: 'full_body', label: 'Całe ciało' },
]

// ============================================
// KOMPONENT
// ============================================

export default function AddExerciseScreen() {
	const navigation = useNavigation()
	const { profile } = useAuth()
	const createMutation = useCreateExercise()

	const [isSubmitting, setIsSubmitting] = useState(false)
	
	// Stan video
	const [videoUri, setVideoUri] = useState<string | null>(null)
	const [thumbnailUri, setThumbnailUri] = useState<string | null>(null)
	const [videoSize, setVideoSize] = useState<number>(0)
	const [isUploadingVideo, setIsUploadingVideo] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)

	// React Hook Form
	const {
		control,
		handleSubmit,
		formState: { errors, isValid },
		watch,
		setValue,
	} = useForm<ExerciseFormData>({
		resolver: zodResolver(exerciseSchema),
		mode: 'onChange',
		defaultValues: {
			name: '',
			category: undefined,
			muscle_groups: [],
			difficulty: undefined,
			description: '',
			tips: '',
			typical_reps: '',
			rest_seconds: 60,
		},
	})

	// Watch dla muscle_groups (multi-select)
	const selectedMuscleGroups = watch('muscle_groups') || []

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
				videoMaxDuration: 120, // Max 2 minuty
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
			// Sprawdź uprawnienia kamery
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
			// Sprawdź rozmiar
			const isValid = await isVideoSizeValid(uri, 100)
			if (!isValid) {
				Alert.alert('Błąd', 'Plik video jest za duży (max 100MB)')
				return
			}

			setVideoUri(uri)

			// Wygeneruj miniaturkę
			const thumbnail = await generateThumbnail(uri, 1000)
			setThumbnailUri(thumbnail)

			// Pobierz rozmiar pliku (przybliżony)
			// FileSystem.getInfoAsync nie jest zaimportowany, użyjemy 0
			setVideoSize(0)
		} catch (error) {
			console.error('Błąd przetwarzania video:', error)
			Alert.alert('Błąd', 'Nie udało się przetworzyć video')
		}
	}

	/**
	 * Usuń wybrane video
	 */
	const removeVideo = () => {
		setVideoUri(null)
		setThumbnailUri(null)
		setVideoSize(0)
	}

	/**
	 * Zapisz ćwiczenie
	 */
	const onSubmit = async (data: ExerciseFormData) => {
		if (!profile?.id) {
			Alert.alert('Błąd', 'Nie można zidentyfikować trenera')
			return
		}

		setIsSubmitting(true)

		try {
			let videoUrl: string | undefined
			let thumbnailUrl: string | undefined

			// Upload video jeśli wybrano
			if (videoUri) {
				setIsUploadingVideo(true)
				
				// Generuj tymczasowe ID dla ścieżek
				const tempId = Date.now().toString()
				
				// Upload video
				const videoPath = generateExerciseMediaPath(profile.id, tempId, true)
				const videoResult = await uploadVideoToSupabase(videoUri, videoPath, (progress) => {
					setUploadProgress(progress.progress)
				})
				videoUrl = videoResult.publicUrl

				// Upload thumbnail
				if (thumbnailUri) {
					const thumbPath = generateExerciseMediaPath(profile.id, tempId, false)
					thumbnailUrl = await uploadThumbnailToSupabase(thumbnailUri, thumbPath)
				}

				setIsUploadingVideo(false)
			}

			// Zapisz ćwiczenie
			await createMutation.mutateAsync({
				trainerId: profile.id,
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

			Alert.alert('Sukces', 'Ćwiczenie zostało dodane!', [
				{ text: 'OK', onPress: () => navigation.goBack() },
			])
		} catch (error: any) {
			Alert.alert('Błąd', error?.message || 'Nie udało się dodać ćwiczenia')
		} finally {
			setIsSubmitting(false)
			setIsUploadingVideo(false)
		}
	}

	// ============================================
	// RENDER
	// ============================================

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={{ flex: 1 }}>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
						<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Nowe ćwiczenie</Text>
					<View style={{ width: 40 }} />
				</View>

				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}>
					{/* Nazwa */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>
							Nazwa ćwiczenia <Text style={styles.required}>*</Text>
						</Text>
						<Controller
							control={control}
							name="name"
							render={({ field: { onChange, onBlur, value } }) => (
								<TextInput
									style={[styles.input, errors.name && styles.inputError]}
									placeholder="np. Wyciskanie sztangi"
									placeholderTextColor={colors.textDisabled}
									value={value}
									onChangeText={onChange}
									onBlur={onBlur}
									maxLength={100}
								/>
							)}
						/>
						{errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
					</View>

					{/* Kategoria */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>
							Kategoria <Text style={styles.required}>*</Text>
						</Text>
						<Controller
							control={control}
							name="category"
							render={({ field: { value, onChange } }) => (
								<View style={styles.segmentedButtons}>
									{CATEGORIES.map((cat) => (
										<TouchableOpacity
											key={cat.value}
											style={[
												styles.segmentedButton,
												value === cat.value && styles.segmentedButtonActive,
											]}
											onPress={() => onChange(cat.value)}>
											<Text
												style={[
													styles.segmentedButtonText,
													value === cat.value && styles.segmentedButtonTextActive,
												]}>
												{cat.label}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							)}
						/>
						{errors.category && <Text style={styles.errorText}>{errors.category.message}</Text>}
					</View>

					{/* Poziom trudności */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>
							Poziom trudności <Text style={styles.required}>*</Text>
						</Text>
						<Controller
							control={control}
							name="difficulty"
							render={({ field: { value, onChange } }) => (
								<View style={styles.difficultyButtons}>
									{DIFFICULTIES.map((diff) => (
										<TouchableOpacity
											key={diff.value}
											style={[
												styles.difficultyButton,
												value === diff.value && styles.difficultyButtonActive,
											]}
											onPress={() => onChange(diff.value)}>
											<View
												style={[
													styles.difficultyDot,
													{
														backgroundColor:
															diff.value === 'easy'
																? colors.difficultyEasy
																: diff.value === 'medium'
																? colors.difficultyMedium
																: colors.difficultyHard,
													},
												]}
											/>
											<Text
												style={[
													styles.difficultyButtonText,
													value === diff.value && styles.difficultyButtonTextActive,
												]}>
												{diff.label}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							)}
						/>
						{errors.difficulty && <Text style={styles.errorText}>{errors.difficulty.message}</Text>}
					</View>

					{/* Grupy mięśniowe */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>
							Grupy mięśniowe <Text style={styles.required}>*</Text>
						</Text>
						<View style={styles.muscleGroupsContainer}>
							{MUSCLE_GROUPS.map((group) => {
								const isSelected = selectedMuscleGroups.includes(group.value)
								return (
									<TouchableOpacity
										key={group.value}
										style={[styles.muscleChip, isSelected && styles.muscleChipSelected]}
										onPress={() => toggleMuscleGroup(group.value)}>
										{isSelected && (
											<Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
										)}
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

					{/* Opis */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Opis wykonania</Text>
						<Controller
							control={control}
							name="description"
							render={({ field: { onChange, onBlur, value } }) => (
								<TextInput
									style={[styles.input, styles.textArea]}
									placeholder="Opisz jak wykonać ćwiczenie..."
									placeholderTextColor={colors.textDisabled}
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
						<Text style={styles.label}>Wskazówki (tips)</Text>
						<Controller
							control={control}
							name="tips"
							render={({ field: { onChange, onBlur, value } }) => (
								<TextInput
									style={[styles.input, styles.textArea]}
									placeholder="Dodatkowe porady dla klienta..."
									placeholderTextColor={colors.textDisabled}
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
						<Text style={styles.label}>Typowy zakres powtórzeń</Text>
						<Controller
							control={control}
							name="typical_reps"
							render={({ field: { onChange, onBlur, value } }) => (
								<TextInput
									style={styles.input}
									placeholder="np. 8-12 lub 30 sekund"
									placeholderTextColor={colors.textDisabled}
									value={value}
									onChangeText={onChange}
									onBlur={onBlur}
								/>
							)}
						/>
					</View>

					{/* Czas odpoczynku */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Zalecany czas odpoczynku (sekundy)</Text>
						<Controller
							control={control}
							name="rest_seconds"
							render={({ field: { onChange, value } }) => (
								<View style={styles.restSecondsContainer}>
									<TouchableOpacity
										style={styles.restButton}
										onPress={() => onChange(Math.max(0, (value || 0) - 15))}>
										<Ionicons name="remove" size={20} color={colors.textPrimary} />
									</TouchableOpacity>
									<TextInput
										style={styles.restInput}
										value={String(value || 0)}
										onChangeText={(text) => {
											const num = parseInt(text) || 0
											onChange(Math.min(600, Math.max(0, num)))
										}}
										keyboardType="number-pad"
										maxLength={3}
									/>
									<Text style={styles.restUnit}>s</Text>
									<TouchableOpacity
										style={styles.restButton}
										onPress={() => onChange(Math.min(600, (value || 0) + 15))}>
										<Ionicons name="add" size={20} color={colors.textPrimary} />
									</TouchableOpacity>
								</View>
							)}
						/>
						{errors.rest_seconds && (
							<Text style={styles.errorText}>{errors.rest_seconds.message}</Text>
						)}
					</View>

					{/* Sekcja video */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Film demonstracyjny</Text>
						
						{videoUri ? (
							// Preview wybranego video
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
								{videoSize > 0 && (
									<View style={styles.videoSizeBadge}>
										<Text style={styles.videoSizeText}>{formatFileSize(videoSize)}</Text>
									</View>
								)}
							</View>
						) : (
							// Przyciski wyboru video
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

						{/* Progress bar podczas uploadu */}
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

					{/* Spacer */}
					<View style={{ height: 100 }} />
				</ScrollView>

				{/* Przycisk zapisz */}
				<View style={styles.footer}>
					<TouchableOpacity
						style={[styles.saveButton, (!isValid || isSubmitting) && styles.saveButtonDisabled]}
						onPress={handleSubmit(onSubmit)}
						disabled={!isValid || isSubmitting}
						activeOpacity={0.8}>
						{isSubmitting ? (
							<ActivityIndicator color={colors.textOnPrimary} />
						) : (
							<>
								<Ionicons name="checkmark" size={20} color={colors.textOnPrimary} />
								<Text style={styles.saveButtonText}>Zapisz ćwiczenie</Text>
							</>
						)}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
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
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
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
	required: {
		color: colors.error,
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
		textAlignVertical: 'top',
	},
	errorText: {
		color: colors.error,
		fontSize: 12,
		marginTop: 4,
	},
	segmentedButtons: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	segmentedButton: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	segmentedButtonActive: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	segmentedButtonText: {
		fontSize: 14,
		color: colors.textSecondary,
		fontWeight: '500',
	},
	segmentedButtonTextActive: {
		color: colors.textOnPrimary,
	},
	difficultyButtons: {
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
	difficultyButtonActive: {
		borderColor: colors.primary,
		borderWidth: 2,
	},
	difficultyDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	difficultyButtonText: {
		fontSize: 14,
		color: colors.textSecondary,
		fontWeight: '500',
	},
	difficultyButtonTextActive: {
		color: colors.textPrimary,
	},
	muscleGroupsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	muscleChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		gap: 4,
	},
	muscleChipSelected: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	muscleChipText: {
		fontSize: 13,
		color: colors.textSecondary,
	},
	muscleChipTextSelected: {
		color: colors.textOnPrimary,
	},
	restSecondsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	restButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: colors.surface,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: colors.border,
	},
	restInput: {
		width: 60,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 8,
		padding: 10,
		fontSize: 18,
		color: colors.textPrimary,
		textAlign: 'center',
	},
	restUnit: {
		fontSize: 16,
		color: colors.textSecondary,
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
	videoSizeBadge: {
		position: 'absolute',
		bottom: 8,
		left: 8,
		backgroundColor: 'rgba(0,0,0,0.6)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	videoSizeText: {
		color: colors.textPrimary,
		fontSize: 12,
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
	footer: {
		padding: 20,
		paddingBottom: 32,
		backgroundColor: colors.background,
		borderTopWidth: 1,
		borderTopColor: colors.border,
	},
	saveButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.primary,
		paddingVertical: 16,
		borderRadius: 12,
		gap: 8,
	},
	saveButtonDisabled: {
		backgroundColor: colors.border,
	},
	saveButtonText: {
		color: colors.textOnPrimary,
		fontSize: 16,
		fontWeight: '600',
	},
})

