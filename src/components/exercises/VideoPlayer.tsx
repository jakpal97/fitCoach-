/**
 * VideoPlayer - Odtwarzacz video dla ćwiczeń
 *
 * Komponent z custom kontrolkami do odtwarzania filmów instruktażowych.
 */

import React, { useState, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, Image } from 'react-native'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/colors'

// ============================================
// TYPY
// ============================================

export interface VideoPlayerProps {
	/** URL do pliku video */
	videoUrl: string
	/** URL do miniaturki (opcjonalnie) */
	thumbnailUrl?: string
	/** Automatyczne odtwarzanie */
	autoplay?: boolean
	/** Zapętlenie video */
	loop?: boolean
	/** Pokazuj kontrolki */
	showControls?: boolean
	/** Wysokość komponentu (domyślnie 250) */
	height?: number
	/** Callback gdy video się skończy */
	onComplete?: () => void
	/** Callback na błąd */
	onError?: (error: string) => void
}

// ============================================
// KOMPONENT
// ============================================

export default function VideoPlayer({
	videoUrl,
	thumbnailUrl,
	autoplay = false,
	loop = false,
	showControls = true,
	height = 250,
	onComplete,
	onError,
}: VideoPlayerProps) {
	const videoRef = useRef<Video>(null)

	// Stan
	const [isLoading, setIsLoading] = useState(true)
	const [isPlaying, setIsPlaying] = useState(autoplay)
	const [hasError, setHasError] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')
	const [showThumbnail, setShowThumbnail] = useState(!autoplay && !!thumbnailUrl)
	const [duration, setDuration] = useState(0)
	const [position, setPosition] = useState(0)
	const [controlsVisible, setControlsVisible] = useState(true)

	// Timer do ukrywania kontrolek
	const controlsTimeout = useRef<NodeJS.Timeout | null>(null)

	// ============================================
	// HANDLERS
	// ============================================

	/**
	 * Obsługa zmiany statusu video
	 */
	const handlePlaybackStatusUpdate = useCallback(
		(status: AVPlaybackStatus) => {
			if (!status.isLoaded) {
				if (status.error) {
					setHasError(true)
					setErrorMessage('Nie udało się załadować video')
					onError?.(status.error)
				}
				return
			}

			setIsLoading(false)
			setIsPlaying(status.isPlaying)
			setDuration(status.durationMillis || 0)
			setPosition(status.positionMillis || 0)

			// Video się skończyło
			if (status.didJustFinish && !loop) {
				onComplete?.()
			}
		},
		[loop, onComplete, onError]
	)

	/**
	 * Play/Pause toggle
	 */
	const togglePlayPause = async () => {
		if (!videoRef.current) return

		// Ukryj thumbnail przy pierwszym play
		if (showThumbnail) {
			setShowThumbnail(false)
		}

		if (isPlaying) {
			await videoRef.current.pauseAsync()
		} else {
			await videoRef.current.playAsync()
		}

		resetControlsTimeout()
	}

	/**
	 * Restart video
	 */
	const restartVideo = async () => {
		if (!videoRef.current) return
		await videoRef.current.setPositionAsync(0)
		await videoRef.current.playAsync()
		setShowThumbnail(false)
	}

	/**
	 * Seek do pozycji
	 */
	const seekTo = async (positionMs: number) => {
		if (!videoRef.current) return
		await videoRef.current.setPositionAsync(positionMs)
	}

	/**
	 * Przewiń o 10 sekund
	 */
	const skipForward = async () => {
		const newPosition = Math.min(position + 10000, duration)
		await seekTo(newPosition)
		resetControlsTimeout()
	}

	/**
	 * Cofnij o 10 sekund
	 */
	const skipBackward = async () => {
		const newPosition = Math.max(position - 10000, 0)
		await seekTo(newPosition)
		resetControlsTimeout()
	}

	/**
	 * Pokaż/ukryj kontrolki
	 */
	const toggleControls = () => {
		setControlsVisible(!controlsVisible)
		if (!controlsVisible) {
			resetControlsTimeout()
		}
	}

	/**
	 * Reset timera kontrolek
	 */
	const resetControlsTimeout = () => {
		if (controlsTimeout.current) {
			clearTimeout(controlsTimeout.current)
		}
		setControlsVisible(true)
		controlsTimeout.current = setTimeout(() => {
			if (isPlaying) {
				setControlsVisible(false)
			}
		}, 3000)
	}

	/**
	 * Formatuj czas (ms -> mm:ss)
	 */
	const formatTime = (ms: number): string => {
		const totalSeconds = Math.floor(ms / 1000)
		const minutes = Math.floor(totalSeconds / 60)
		const seconds = totalSeconds % 60
		return `${minutes}:${seconds.toString().padStart(2, '0')}`
	}

	/**
	 * Oblicz progress bar
	 */
	const progressPercent = duration > 0 ? (position / duration) * 100 : 0

	// ============================================
	// RENDER - ERROR STATE
	// ============================================

	if (hasError) {
		return (
			<View style={[styles.container, { height }]}>
				<View style={styles.errorContainer}>
					<Ionicons name="alert-circle" size={48} color={colors.error} />
					<Text style={styles.errorText}>{errorMessage}</Text>
					<TouchableOpacity style={styles.retryButton} onPress={() => setHasError(false)}>
						<Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
					</TouchableOpacity>
				</View>
			</View>
		)
	}

	// ============================================
	// RENDER - MAIN
	// ============================================

	return (
		<View style={[styles.container, { height }]}>
			{/* Video */}
			<Video
				ref={videoRef}
				source={{ uri: videoUrl }}
				style={styles.video}
				resizeMode={ResizeMode.CONTAIN}
				shouldPlay={autoplay}
				isLooping={loop}
				onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
				onLoad={() => setIsLoading(false)}
				onError={error => {
					setHasError(true)
					setErrorMessage('Błąd ładowania video')
					onError?.(error)
				}}
			/>

			{/* Thumbnail overlay */}
			{showThumbnail && thumbnailUrl && (
				<View style={styles.thumbnailOverlay}>
					<Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
					<TouchableOpacity style={styles.playButtonLarge} onPress={togglePlayPause}>
						<Ionicons name="play" size={48} color={colors.textOnPrimary} />
					</TouchableOpacity>
				</View>
			)}

			{/* Loading spinner */}
			{isLoading && !showThumbnail && (
				<View style={styles.loadingOverlay}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			)}

			{/* Controls overlay */}
			{showControls && !showThumbnail && (
				<TouchableOpacity
					style={[styles.controlsOverlay, { opacity: controlsVisible ? 1 : 0 }]}
					activeOpacity={1}
					onPress={toggleControls}>
					{controlsVisible && (
						<>
							{/* Center controls */}
							<View style={styles.centerControls}>
								{/* Skip backward */}
								<TouchableOpacity style={styles.skipButton} onPress={skipBackward}>
									<Ionicons name="play-back" size={28} color={colors.textPrimary} />
								</TouchableOpacity>

								{/* Play/Pause */}
								<TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
									<Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color={colors.textOnPrimary} />
								</TouchableOpacity>

								{/* Skip forward */}
								<TouchableOpacity style={styles.skipButton} onPress={skipForward}>
									<Ionicons name="play-forward" size={28} color={colors.textPrimary} />
								</TouchableOpacity>
							</View>

							{/* Bottom controls */}
							<View style={styles.bottomControls}>
								{/* Progress bar */}
								<View style={styles.progressBarContainer}>
									<View style={styles.progressBarBackground}>
										<View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
									</View>
								</View>

								{/* Time */}
								<View style={styles.timeContainer}>
									<Text style={styles.timeText}>{formatTime(position)}</Text>
									<Text style={styles.timeText}> / </Text>
									<Text style={styles.timeText}>{formatTime(duration)}</Text>
								</View>
							</View>
						</>
					)}
				</TouchableOpacity>
			)}

			{/* Restart button (gdy video się skończyło) */}
			{!isPlaying && position > 0 && position >= duration - 500 && !loop && (
				<View style={styles.restartOverlay}>
					<TouchableOpacity style={styles.restartButton} onPress={restartVideo}>
						<Ionicons name="refresh" size={32} color={colors.textOnPrimary} />
						<Text style={styles.restartText}>Odtwórz ponownie</Text>
					</TouchableOpacity>
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
		width: '100%',
		backgroundColor: colors.surface,
		borderRadius: 12,
		overflow: 'hidden',
		position: 'relative',
	},
	video: {
		width: '100%',
		height: '100%',
	},
	thumbnailOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
	},
	thumbnail: {
		...StyleSheet.absoluteFillObject,
	},
	playButtonLarge: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
		paddingLeft: 6, // Offset dla ikony play
	},
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	controlsOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.3)',
	},
	centerControls: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 32,
	},
	skipButton: {
		padding: 8,
	},
	playButton: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
		paddingLeft: 4,
	},
	bottomControls: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		padding: 12,
	},
	progressBarContainer: {
		marginBottom: 8,
	},
	progressBarBackground: {
		height: 4,
		backgroundColor: 'rgba(255, 255, 255, 0.3)',
		borderRadius: 2,
		overflow: 'hidden',
	},
	progressBarFill: {
		height: '100%',
		backgroundColor: colors.primary,
		borderRadius: 2,
	},
	timeContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
	},
	timeText: {
		color: colors.textPrimary,
		fontSize: 12,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	errorText: {
		color: colors.textSecondary,
		fontSize: 14,
		marginTop: 12,
		textAlign: 'center',
	},
	retryButton: {
		marginTop: 16,
		paddingHorizontal: 20,
		paddingVertical: 10,
		backgroundColor: colors.primary,
		borderRadius: 8,
	},
	retryButtonText: {
		color: colors.textOnPrimary,
		fontSize: 14,
		fontWeight: '600',
	},
	restartOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
	},
	restartButton: {
		alignItems: 'center',
		gap: 8,
	},
	restartText: {
		color: colors.textPrimary,
		fontSize: 14,
	},
})
