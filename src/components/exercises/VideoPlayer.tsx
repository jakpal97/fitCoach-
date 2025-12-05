/**
 * VideoPlayer - Odtwarzacz video dla ćwiczeń
 *
 * Komponent z custom kontrolkami do odtwarzania filmów instruktażowych.
 * Używa nowego API expo-video.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Image } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
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
	// Inicjalizuj player z nowym API expo-video
	const player = useVideoPlayer(videoUrl, (player) => {
		player.loop = loop
		if (autoplay) {
			player.play()
		}
	})

	// Stan
	const [isLoading, setIsLoading] = useState(true)
	const [isPlaying, setIsPlaying] = useState(autoplay)
	const [hasError, setHasError] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')
	const [showThumbnail, setShowThumbnail] = useState(!autoplay && !!thumbnailUrl)
	const [controlsVisible, setControlsVisible] = useState(true)

	// Nasłuchuj zmian stanu playera
	useEffect(() => {
		if (!player) return

		const subscription = player.addListener('statusChange', (status) => {
			if (status.status === 'readyToPlay') {
				setIsLoading(false)
			} else if (status.status === 'error') {
				setHasError(true)
				setErrorMessage('Nie udało się załadować video')
				onError?.('Błąd ładowania video')
			}
		})

		const playingSubscription = player.addListener('playingChange', (isPlaying) => {
			setIsPlaying(isPlaying)
		})

		const endSubscription = player.addListener('playToEnd', () => {
			if (!loop) {
				onComplete?.()
			}
		})

		return () => {
			subscription.remove()
			playingSubscription.remove()
			endSubscription.remove()
		}
	}, [player, loop, onComplete, onError])

	// ============================================
	// HANDLERS
	// ============================================

	/**
	 * Play/Pause toggle
	 */
	const togglePlayPause = useCallback(() => {
		if (!player) return

		// Ukryj thumbnail przy pierwszym play
		if (showThumbnail) {
			setShowThumbnail(false)
		}

		if (isPlaying) {
			player.pause()
		} else {
			player.play()
		}
	}, [player, isPlaying, showThumbnail])

	/**
	 * Restart video
	 */
	const restartVideo = useCallback(() => {
		if (!player) return
		player.currentTime = 0
		player.play()
		setShowThumbnail(false)
	}, [player])

	/**
	 * Pokaż/ukryj kontrolki
	 */
	const toggleControls = useCallback(() => {
		setControlsVisible((prev) => !prev)
	}, [])

	// ============================================
	// RENDER - ERROR STATE
	// ============================================

	if (hasError) {
		return (
			<View style={[styles.container, { height }]}>
				<View style={styles.errorContainer}>
					<Ionicons name="alert-circle" size={48} color={colors.error} />
					<Text style={styles.errorText}>{errorMessage}</Text>
					<TouchableOpacity style={styles.retryButton} onPress={() => {
						setHasError(false)
						setIsLoading(true)
						player?.play()
					}}>
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
			{/* Video - nowe API expo-video */}
			<VideoView
				player={player}
				style={styles.video}
				contentFit="contain"
				nativeControls={false}
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
						<View style={styles.centerControls}>
							{/* Play/Pause */}
							<TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
								<Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color={colors.textOnPrimary} />
							</TouchableOpacity>
						</View>
					)}
				</TouchableOpacity>
			)}

			{/* Thumbnail z przyciskiem play (gdy nie ma thumbnailUrl) */}
			{showThumbnail && !thumbnailUrl && (
				<View style={styles.thumbnailOverlay}>
					<TouchableOpacity style={styles.playButtonLarge} onPress={togglePlayPause}>
						<Ionicons name="play" size={48} color={colors.textOnPrimary} />
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
		backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
	playButton: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
		paddingLeft: 4,
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
})
