/**
 * Narzędzia do obsługi video w FitCoach
 *
 * Kompresja, generowanie miniaturek i upload do Supabase Storage.
 */

import * as FileSystem from 'expo-file-system/legacy'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { supabase } from '../api/supabase'

// ============================================
// TYPY
// ============================================

export interface VideoCompressionOptions {
	/** Maksymalna szerokość w pikselach (domyślnie 720) */
	maxWidth?: number
	/** Maksymalna wysokość w pikselach (domyślnie 1280) */
	maxHeight?: number
	/** Jakość kompresji 0-1 (domyślnie 0.7) */
	quality?: number
}

export interface UploadProgress {
	/** Postęp 0-100 */
	progress: number
	/** Przesłane bajty */
	loaded: number
	/** Całkowity rozmiar */
	total: number
}

export interface UploadResult {
	/** Publiczny URL do pliku */
	publicUrl: string
	/** Ścieżka w bucket */
	path: string
}

// ============================================
// KOMPRESJA VIDEO
// ============================================

/**
 * Kompresuje video (placeholder - Expo nie ma natywnej kompresji)
 *
 * UWAGA: Expo nie ma wbudowanej kompresji video.
 * W produkcji użyj: react-native-video-processing lub FFmpeg.
 * Na razie zwracamy oryginalny URI.
 *
 * @param uri - URI lokalnego pliku video
 * @param options - Opcje kompresji
 * @returns URI skompresowanego video (na razie oryginał)
 */
export async function compressVideo(
	uri: string,
	options?: VideoCompressionOptions
): Promise<string> {
	// Sprawdź czy plik istnieje
	const fileInfo = await FileSystem.getInfoAsync(uri)

	if (!fileInfo.exists) {
		throw new Error('Plik video nie istnieje')
	}

	// TODO: Implementacja kompresji z FFmpeg lub react-native-video-processing
	// Na razie zwracamy oryginalny URI
	console.log('⚠️ Kompresja video nie jest jeszcze zaimplementowana. Używam oryginału.')
	console.log(`Rozmiar pliku: ${((fileInfo as any).size / 1024 / 1024).toFixed(2)} MB`)

	return uri
}

/**
 * Sprawdza rozmiar pliku video
 *
 * @param uri - URI pliku
 * @returns Rozmiar w bajtach
 */
export async function getVideoFileSize(uri: string): Promise<number> {
	const fileInfo = await FileSystem.getInfoAsync(uri)

	if (!fileInfo.exists) {
		throw new Error('Plik nie istnieje')
	}

	return (fileInfo as any).size || 0
}

/**
 * Sprawdza czy video nie przekracza limitu rozmiaru
 *
 * @param uri - URI pliku
 * @param maxSizeMB - Maksymalny rozmiar w MB (domyślnie 100)
 * @returns true jeśli plik jest w limicie
 */
export async function isVideoSizeValid(uri: string, maxSizeMB: number = 100): Promise<boolean> {
	const size = await getVideoFileSize(uri)
	const maxSizeBytes = maxSizeMB * 1024 * 1024
	return size <= maxSizeBytes
}

// ============================================
// GENEROWANIE MINIATUREK
// ============================================

/**
 * Generuje miniaturkę z video
 *
 * @param videoUri - URI pliku video
 * @param timeMs - Czas w milisekundach, z którego wygenerować miniaturkę (domyślnie 1000)
 * @returns URI wygenerowanej miniaturki
 *
 * @example
 * const thumbnailUri = await generateThumbnail('file:///video.mp4');
 */
export async function generateThumbnail(
	videoUri: string,
	timeMs: number = 1000
): Promise<string> {
	try {
		const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
			time: timeMs,
			quality: 0.8,
		})

		return uri
	} catch (error) {
		console.error('Błąd generowania miniaturki:', error)
		throw new Error('Nie udało się wygenerować miniaturki z video')
	}
}

/**
 * Generuje wiele miniaturek z różnych momentów video
 *
 * @param videoUri - URI pliku video
 * @param count - Liczba miniaturek do wygenerowania
 * @param durationMs - Przybliżony czas trwania video w ms
 * @returns Tablica URI miniaturek
 */
export async function generateMultipleThumbnails(
	videoUri: string,
	count: number = 3,
	durationMs: number = 10000
): Promise<string[]> {
	const thumbnails: string[] = []
	const interval = durationMs / (count + 1)

	for (let i = 1; i <= count; i++) {
		try {
			const timeMs = Math.floor(interval * i)
			const uri = await generateThumbnail(videoUri, timeMs)
			thumbnails.push(uri)
		} catch (error) {
			console.warn(`Nie udało się wygenerować miniaturki ${i}:`, error)
		}
	}

	return thumbnails
}

// ============================================
// UPLOAD DO SUPABASE STORAGE
// ============================================

/**
 * Uploaduje video do Supabase Storage
 *
 * @param uri - URI lokalnego pliku video
 * @param path - Ścieżka w bucket (np. "trainer-id/exercise-id/video.mp4")
 * @param onProgress - Callback dla postępu uploadu
 * @returns Obiekt z publicznym URL i ścieżką
 *
 * @example
 * const result = await uploadVideoToSupabase(
 *   'file:///video.mp4',
 *   'trainer123/exercise456/video.mp4',
 *   (progress) => console.log(`${progress.progress}%`)
 * );
 */
export async function uploadVideoToSupabase(
	uri: string,
	path: string,
	onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
	try {
		// Sprawdź rozmiar pliku
		const isValid = await isVideoSizeValid(uri, 100) // Max 100MB
		if (!isValid) {
			throw new Error('Plik video jest za duży (max 100MB)')
		}

		// Odczytaj plik jako base64
		const base64 = await FileSystem.readAsStringAsync(uri, {
			encoding: FileSystem.EncodingType.Base64,
		})

		// Konwertuj base64 na ArrayBuffer
		const binaryString = atob(base64)
		const bytes = new Uint8Array(binaryString.length)
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i)
		}

		// Określ content type
		const contentType = uri.toLowerCase().endsWith('.mov')
			? 'video/quicktime'
			: 'video/mp4'

		// Upload do Supabase Storage
		const { data, error } = await supabase.storage
			.from('exercise-videos')
			.upload(path, bytes, {
				contentType,
				upsert: true,
			})

		if (error) {
			throw error
		}

		// Pobierz publiczny URL
		const { data: urlData } = supabase.storage
			.from('exercise-videos')
			.getPublicUrl(path)

		// Symulacja postępu (Supabase JS nie wspiera progress natywnie)
		if (onProgress) {
			onProgress({ progress: 100, loaded: bytes.length, total: bytes.length })
		}

		return {
			publicUrl: urlData.publicUrl,
			path: data.path,
		}
	} catch (error) {
		console.error('Błąd uploadu video:', error)
		throw new Error('Nie udało się przesłać video')
	}
}

/**
 * Uploaduje miniaturkę do Supabase Storage
 *
 * @param uri - URI lokalnego pliku obrazu
 * @param path - Ścieżka w bucket
 * @returns Publiczny URL miniaturki
 */
export async function uploadThumbnailToSupabase(
	uri: string,
	path: string
): Promise<string> {
	try {
		// Odczytaj plik jako base64
		const base64 = await FileSystem.readAsStringAsync(uri, {
			encoding: FileSystem.EncodingType.Base64,
		})

		// Konwertuj base64 na ArrayBuffer
		const binaryString = atob(base64)
		const bytes = new Uint8Array(binaryString.length)
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i)
		}

		// Upload do Supabase Storage
		const { error } = await supabase.storage
			.from('exercise-videos')
			.upload(path, bytes, {
				contentType: 'image/jpeg',
				upsert: true,
			})

		if (error) {
			throw error
		}

		// Pobierz publiczny URL
		const { data: urlData } = supabase.storage
			.from('exercise-videos')
			.getPublicUrl(path)

		return urlData.publicUrl
	} catch (error) {
		console.error('Błąd uploadu miniaturki:', error)
		throw new Error('Nie udało się przesłać miniaturki')
	}
}

// ============================================
// USUWANIE Z SUPABASE STORAGE
// ============================================

/**
 * Usuwa video z Supabase Storage
 *
 * @param url - Publiczny URL lub ścieżka pliku
 *
 * @example
 * await deleteVideoFromSupabase('https://xxx.supabase.co/storage/v1/object/public/exercise-videos/path/video.mp4');
 */
export async function deleteVideoFromSupabase(url: string): Promise<void> {
	try {
		// Wyciągnij ścieżkę z URL
		let path = url

		// Jeśli to pełny URL, wyciągnij ścieżkę
		if (url.includes('exercise-videos/')) {
			const parts = url.split('exercise-videos/')
			path = parts[parts.length - 1]
		}

		const { error } = await supabase.storage
			.from('exercise-videos')
			.remove([path])

		if (error) {
			throw error
		}
	} catch (error) {
		console.error('Błąd usuwania video:', error)
		throw new Error('Nie udało się usunąć video')
	}
}

/**
 * Usuwa wiele plików z Supabase Storage
 *
 * @param paths - Tablica ścieżek do usunięcia
 */
export async function deleteMultipleFromSupabase(paths: string[]): Promise<void> {
	if (paths.length === 0) return

	try {
		const { error } = await supabase.storage
			.from('exercise-videos')
			.remove(paths)

		if (error) {
			throw error
		}
	} catch (error) {
		console.error('Błąd usuwania plików:', error)
		throw new Error('Nie udało się usunąć plików')
	}
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generuje unikalną ścieżkę dla pliku video ćwiczenia
 *
 * @param trainerId - ID trenera
 * @param exerciseId - ID ćwiczenia
 * @param isVideo - true dla video, false dla thumbnail
 */
export function generateExerciseMediaPath(
	trainerId: string,
	exerciseId: string,
	isVideo: boolean
): string {
	const timestamp = Date.now()
	const extension = isVideo ? 'mp4' : 'jpg'
	const type = isVideo ? 'video' : 'thumbnail'
	return `${trainerId}/${exerciseId}/${type}_${timestamp}.${extension}`
}

/**
 * Formatuje rozmiar pliku do czytelnej postaci
 *
 * @param bytes - Rozmiar w bajtach
 * @returns Sformatowany string (np. "15.5 MB")
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B'

	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ============================================
// EKSPORT
// ============================================

export default {
	compressVideo,
	generateThumbnail,
	generateMultipleThumbnails,
	uploadVideoToSupabase,
	uploadThumbnailToSupabase,
	deleteVideoFromSupabase,
	deleteMultipleFromSupabase,
	getVideoFileSize,
	isVideoSizeValid,
	generateExerciseMediaPath,
	formatFileSize,
}

