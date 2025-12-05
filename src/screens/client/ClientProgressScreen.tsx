/**
 * ClientProgressScreen - Ekran postępów klienta
 *
 * Wyświetla pomiary, statystyki, porównania miesięczne i historię.
 */

import React, { useState, useMemo, useCallback } from 'react'
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	RefreshControl,
	Modal,
	TextInput,
	Alert,
	ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import {
	useMeasurements,
	useAddMeasurement,
	useDeleteMeasurement,
	type Measurement,
	type MeasurementInput,
} from '../../api/services/measurements'
import { colors } from '../../theme/colors'

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString('pl-PL', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	})
}

function formatShortDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString('pl-PL', {
		day: 'numeric',
		month: 'short',
	})
}

function getDaysSinceLastMeasurement(measurements: Measurement[]): number {
	if (measurements.length === 0) return -1
	const lastDate = new Date(measurements[0].measurement_date)
	const today = new Date()
	const diffTime = Math.abs(today.getTime() - lastDate.getTime())
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function getMonthlyComparison(measurements: Measurement[]) {
	if (measurements.length < 2) return null
	
	const latest = measurements[0]
	const today = new Date()
	const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
	
	// Znajdź pomiar sprzed około miesiąca
	const oldMeasurement = measurements.find(m => {
		const date = new Date(m.measurement_date)
		return date <= oneMonthAgo
	})
	
	if (!oldMeasurement) {
		// Jeśli nie ma pomiaru sprzed miesiąca, użyj najstarszego
		const oldest = measurements[measurements.length - 1]
		if (oldest.id === latest.id) return null
		return { latest, previous: oldest, isMonthly: false }
	}
	
	return { latest, previous: oldMeasurement, isMonthly: true }
}

// ============================================
// KOMPONENT PRZYPOMNIENIA
// ============================================

interface ReminderBannerProps {
	daysSince: number
	onAddMeasurement: () => void
}

function ReminderBanner({ daysSince, onAddMeasurement }: ReminderBannerProps) {
	if (daysSince < 25 && daysSince !== -1) return null
	
	const message = daysSince === -1 
		? 'Dodaj pierwszy pomiar, aby śledzić postępy!'
		: daysSince >= 30 
			? `Minął miesiąc od ostatniego pomiaru! Czas na nowe wymiary 📏`
			: `Zbliża się czas na nowy pomiar (za ${30 - daysSince} dni)`
	
	const isUrgent = daysSince >= 30 || daysSince === -1
	
	return (
		<TouchableOpacity 
			style={[styles.reminderBanner, isUrgent && styles.reminderBannerUrgent]}
			onPress={onAddMeasurement}
			activeOpacity={0.8}
		>
			<View style={styles.reminderContent}>
				<Ionicons 
					name={isUrgent ? "alert-circle" : "time-outline"} 
					size={24} 
					color={isUrgent ? colors.warning : colors.primary} 
				/>
				<Text style={styles.reminderText}>{message}</Text>
			</View>
			<View style={styles.reminderButton}>
				<Ionicons name="add" size={20} color={colors.textOnPrimary} />
			</View>
		</TouchableOpacity>
	)
}

// ============================================
// KOMPONENT PORÓWNANIA
// ============================================

interface ComparisonSectionProps {
	comparison: ReturnType<typeof getMonthlyComparison>
}

function ComparisonSection({ comparison }: ComparisonSectionProps) {
	if (!comparison) return null
	
	const { latest, previous, isMonthly } = comparison
	
	const comparisons = [
		{ 
			label: 'Waga', 
			current: latest.weight_kg, 
			previous: previous.weight_kg, 
			unit: 'kg',
			icon: 'scale',
			inverseGood: true // dla wagi spadek jest dobry
		},
		{ 
			label: 'Tk. tłuszcz.', 
			current: latest.body_fat_percent, 
			previous: previous.body_fat_percent, 
			unit: '%',
			icon: 'body',
			inverseGood: true
		},
		{ 
			label: 'Klatka', 
			current: latest.chest_cm, 
			previous: previous.chest_cm, 
			unit: 'cm',
			icon: 'fitness',
			inverseGood: false // dla obwodów wzrost jest dobry
		},
		{ 
			label: 'Talia', 
			current: latest.waist_cm, 
			previous: previous.waist_cm, 
			unit: 'cm',
			icon: 'resize',
			inverseGood: true // dla talii spadek jest dobry
		},
		{ 
			label: 'Biodra', 
			current: latest.hips_cm, 
			previous: previous.hips_cm, 
			unit: 'cm',
			icon: 'ellipse',
			inverseGood: true
		},
		{ 
			label: 'Biceps L', 
			current: latest.biceps_left_cm, 
			previous: previous.biceps_left_cm, 
			unit: 'cm',
			icon: 'barbell',
			inverseGood: false
		},
		{ 
			label: 'Biceps P', 
			current: latest.biceps_right_cm, 
			previous: previous.biceps_right_cm, 
			unit: 'cm',
			icon: 'barbell',
			inverseGood: false
		},
		{ 
			label: 'Udo L', 
			current: latest.thigh_left_cm, 
			previous: previous.thigh_left_cm, 
			unit: 'cm',
			icon: 'walk',
			inverseGood: false
		},
		{ 
			label: 'Udo P', 
			current: latest.thigh_right_cm, 
			previous: previous.thigh_right_cm, 
			unit: 'cm',
			icon: 'walk',
			inverseGood: false
		},
	].filter(c => c.current !== undefined && c.current !== null && c.previous !== undefined && c.previous !== null)
	
	if (comparisons.length === 0) return null
	
	return (
		<View style={styles.comparisonSection}>
			<View style={styles.comparisonHeader}>
				<Ionicons name="trending-up" size={20} color={colors.primary} />
				<Text style={styles.sectionTitle}>
					{isMonthly ? 'Porównanie miesięczne' : 'Porównanie z początkiem'}
				</Text>
			</View>
			<Text style={styles.comparisonPeriod}>
				{formatShortDate(previous.measurement_date)} → {formatShortDate(latest.measurement_date)}
			</Text>
			
			<View style={styles.comparisonGrid}>
				{comparisons.map((item, index) => {
					const diff = (item.current as number) - (item.previous as number)
					const isGood = item.inverseGood ? diff < 0 : diff > 0
					const isNeutral = diff === 0
					
					return (
						<View key={index} style={styles.comparisonCard}>
							<Text style={styles.comparisonLabel}>{item.label}</Text>
							<Text style={styles.comparisonValue}>
								{item.current}{item.unit}
							</Text>
							<View style={[
								styles.comparisonChange,
								isGood && styles.comparisonChangeGood,
								!isGood && !isNeutral && styles.comparisonChangeBad,
							]}>
								<Ionicons 
									name={diff > 0 ? 'arrow-up' : diff < 0 ? 'arrow-down' : 'remove'} 
									size={12} 
									color={isNeutral ? colors.textSecondary : isGood ? colors.success : colors.error} 
								/>
								<Text style={[
									styles.comparisonChangeText,
									isGood && styles.comparisonChangeTextGood,
									!isGood && !isNeutral && styles.comparisonChangeTextBad,
								]}>
									{Math.abs(diff).toFixed(1)}{item.unit}
								</Text>
							</View>
						</View>
					)
				})}
			</View>
		</View>
	)
}

// ============================================
// KOMPONENT KARTY POMIARU
// ============================================

interface MeasurementCardProps {
	measurement: Measurement
	onDelete: () => void
}

function MeasurementCard({ measurement, onDelete }: MeasurementCardProps) {
	const handleLongPress = () => {
		Alert.alert('Usuń pomiar', 'Czy na pewno chcesz usunąć ten pomiar?', [
			{ text: 'Anuluj', style: 'cancel' },
			{ text: 'Usuń', style: 'destructive', onPress: onDelete },
		])
	}

	const items = [
		{ icon: 'scale-outline', label: null, value: measurement.weight_kg, unit: 'kg' },
		{ icon: 'body-outline', label: null, value: measurement.body_fat_percent, unit: '%' },
		{ icon: null, label: 'Klatka', value: measurement.chest_cm, unit: 'cm' },
		{ icon: null, label: 'Talia', value: measurement.waist_cm, unit: 'cm' },
		{ icon: null, label: 'Biodra', value: measurement.hips_cm, unit: 'cm' },
		{ icon: null, label: 'Biceps L', value: measurement.biceps_left_cm, unit: 'cm' },
		{ icon: null, label: 'Biceps P', value: measurement.biceps_right_cm, unit: 'cm' },
		{ icon: null, label: 'Udo L', value: measurement.thigh_left_cm, unit: 'cm' },
		{ icon: null, label: 'Udo P', value: measurement.thigh_right_cm, unit: 'cm' },
	].filter(item => item.value !== undefined && item.value !== null)

	return (
		<TouchableOpacity style={styles.measurementCard} onLongPress={handleLongPress} activeOpacity={0.7}>
			<View style={styles.measurementHeader}>
				<Text style={styles.measurementDate}>{formatDate(measurement.measurement_date)}</Text>
				<TouchableOpacity onPress={handleLongPress}>
					<Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
				</TouchableOpacity>
			</View>

			<View style={styles.measurementGrid}>
				{items.map((item, index) => (
					<View key={index} style={styles.measurementItem}>
						{item.icon ? (
							<Ionicons name={item.icon as any} size={16} color={colors.primary} />
						) : (
							<Text style={styles.measurementLabel}>{item.label}</Text>
						)}
						<Text style={styles.measurementValue}>{item.value} {item.unit}</Text>
					</View>
				))}
			</View>

			{measurement.notes && <Text style={styles.measurementNotes}>{measurement.notes}</Text>}
		</TouchableOpacity>
	)
}

// ============================================
// MODAL DODAWANIA POMIARU
// ============================================

interface AddMeasurementModalProps {
	visible: boolean
	onClose: () => void
	onSave: (input: MeasurementInput) => void
	isSaving: boolean
}

function AddMeasurementModal({ visible, onClose, onSave, isSaving }: AddMeasurementModalProps) {
	const [weight, setWeight] = useState('')
	const [bodyFat, setBodyFat] = useState('')
	const [chest, setChest] = useState('')
	const [waist, setWaist] = useState('')
	const [hips, setHips] = useState('')
	const [bicepsLeft, setBicepsLeft] = useState('')
	const [bicepsRight, setBicepsRight] = useState('')
	const [thighLeft, setThighLeft] = useState('')
	const [thighRight, setThighRight] = useState('')
	const [notes, setNotes] = useState('')

	const handleSave = () => {
		if (!weight && !bodyFat && !chest && !waist && !hips) {
			Alert.alert('Uwaga', 'Wprowadź przynajmniej jeden pomiar')
			return
		}

		const input: MeasurementInput = {
			measurement_date: new Date().toISOString().split('T')[0],
			weight_kg: weight ? parseFloat(weight) : undefined,
			body_fat_percent: bodyFat ? parseFloat(bodyFat) : undefined,
			chest_cm: chest ? parseFloat(chest) : undefined,
			waist_cm: waist ? parseFloat(waist) : undefined,
			hips_cm: hips ? parseFloat(hips) : undefined,
			biceps_left_cm: bicepsLeft ? parseFloat(bicepsLeft) : undefined,
			biceps_right_cm: bicepsRight ? parseFloat(bicepsRight) : undefined,
			thigh_left_cm: thighLeft ? parseFloat(thighLeft) : undefined,
			thigh_right_cm: thighRight ? parseFloat(thighRight) : undefined,
			notes: notes || undefined,
		}

		onSave(input)
	}

	const handleClose = () => {
		setWeight('')
		setBodyFat('')
		setChest('')
		setWaist('')
		setHips('')
		setBicepsLeft('')
		setBicepsRight('')
		setThighLeft('')
		setThighRight('')
		setNotes('')
		onClose()
	}

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<SafeAreaView style={styles.modalContainer}>
				<View style={styles.modalHeader}>
					<TouchableOpacity onPress={handleClose}>
						<Ionicons name="close" size={28} color={colors.textPrimary} />
					</TouchableOpacity>
					<Text style={styles.modalTitle}>Nowy pomiar</Text>
					<TouchableOpacity onPress={handleSave} disabled={isSaving}>
						{isSaving ? (
							<ActivityIndicator size="small" color={colors.primary} />
						) : (
							<Text style={styles.saveText}>Zapisz</Text>
						)}
					</TouchableOpacity>
				</View>

				<ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
					{/* Podstawowe */}
					<Text style={styles.inputGroupTitle}>Podstawowe</Text>
					<View style={styles.inputRow}>
						<View style={styles.inputWrapper}>
							<Text style={styles.inputLabel}>Waga (kg)</Text>
							<TextInput
								style={styles.input}
								value={weight}
								onChangeText={setWeight}
								keyboardType="decimal-pad"
								placeholder="np. 75.5"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
						<View style={styles.inputWrapper}>
							<Text style={styles.inputLabel}>Tkanka tł. (%)</Text>
							<TextInput
								style={styles.input}
								value={bodyFat}
								onChangeText={setBodyFat}
								keyboardType="decimal-pad"
								placeholder="np. 15"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
					</View>

					{/* Obwody */}
					<Text style={styles.inputGroupTitle}>Obwody</Text>
					<View style={styles.inputRow}>
						<View style={styles.inputWrapper}>
							<Text style={styles.inputLabel}>Klatka (cm)</Text>
							<TextInput
								style={styles.input}
								value={chest}
								onChangeText={setChest}
								keyboardType="decimal-pad"
								placeholder="-"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
						<View style={styles.inputWrapper}>
							<Text style={styles.inputLabel}>Talia (cm)</Text>
							<TextInput
								style={styles.input}
								value={waist}
								onChangeText={setWaist}
								keyboardType="decimal-pad"
								placeholder="-"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
						<View style={styles.inputWrapper}>
							<Text style={styles.inputLabel}>Biodra (cm)</Text>
							<TextInput
								style={styles.input}
								value={hips}
								onChangeText={setHips}
								keyboardType="decimal-pad"
								placeholder="-"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
					</View>

					<View style={styles.inputRow}>
						<View style={styles.inputWrapper}>
							<Text style={styles.inputLabel}>Biceps L (cm)</Text>
							<TextInput
								style={styles.input}
								value={bicepsLeft}
								onChangeText={setBicepsLeft}
								keyboardType="decimal-pad"
								placeholder="-"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
						<View style={styles.inputWrapper}>
							<Text style={styles.inputLabel}>Biceps P (cm)</Text>
							<TextInput
								style={styles.input}
								value={bicepsRight}
								onChangeText={setBicepsRight}
								keyboardType="decimal-pad"
								placeholder="-"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
					</View>

					<View style={styles.inputRow}>
						<View style={styles.inputWrapper}>
							<Text style={styles.inputLabel}>Udo L (cm)</Text>
							<TextInput
								style={styles.input}
								value={thighLeft}
								onChangeText={setThighLeft}
								keyboardType="decimal-pad"
								placeholder="-"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
						<View style={styles.inputWrapper}>
							<Text style={styles.inputLabel}>Udo P (cm)</Text>
							<TextInput
								style={styles.input}
								value={thighRight}
								onChangeText={setThighRight}
								keyboardType="decimal-pad"
								placeholder="-"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
					</View>

					{/* Notatki */}
					<Text style={styles.inputGroupTitle}>Notatki</Text>
					<TextInput
						style={[styles.input, styles.notesInputField]}
						value={notes}
						onChangeText={setNotes}
						placeholder="Opcjonalne notatki..."
						placeholderTextColor={colors.textTertiary}
						multiline
						numberOfLines={3}
					/>
				</ScrollView>
			</SafeAreaView>
		</Modal>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function ClientProgressScreen() {
	const { currentUser } = useAuth()
	const userId = currentUser?.id || ''

	const { data: measurements = [], isLoading, refetch, isRefetching } = useMeasurements(userId)
	const addMeasurement = useAddMeasurement()
	const deleteMeasurement = useDeleteMeasurement()

	const [showAddModal, setShowAddModal] = useState(false)

	// Obliczenia
	const daysSinceLastMeasurement = useMemo(() => getDaysSinceLastMeasurement(measurements), [measurements])
	const comparison = useMemo(() => getMonthlyComparison(measurements), [measurements])

	const handleAddMeasurement = useCallback(
		async (input: MeasurementInput) => {
			try {
				await addMeasurement.mutateAsync({ userId, input })
				setShowAddModal(false)
				Alert.alert('Sukces', 'Pomiar został dodany')
			} catch (error: any) {
				Alert.alert('Błąd', error.message || 'Nie udało się dodać pomiaru')
			}
		},
		[userId, addMeasurement]
	)

	const handleDeleteMeasurement = useCallback(
		async (measurementId: string) => {
			try {
				await deleteMeasurement.mutateAsync(measurementId)
			} catch (error: any) {
				Alert.alert('Błąd', error.message || 'Nie udało się usunąć pomiaru')
			}
		},
		[deleteMeasurement]
	)

	if (isLoading) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			</SafeAreaView>
		)
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.headerTitle}>Twoje postępy 📊</Text>
				</View>

				{/* Przypomnienie */}
				<ReminderBanner 
					daysSince={daysSinceLastMeasurement} 
					onAddMeasurement={() => setShowAddModal(true)} 
				/>

				{/* Porównanie miesięczne */}
				<ComparisonSection comparison={comparison} />

				{/* Lista pomiarów */}
				<View style={styles.measurementsSection}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Historia pomiarów</Text>
						<TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
							<Ionicons name="add" size={20} color={colors.textOnPrimary} />
						</TouchableOpacity>
					</View>

					{measurements.length === 0 ? (
						<View style={styles.emptyState}>
							<Ionicons name="analytics-outline" size={64} color={colors.textTertiary} />
							<Text style={styles.emptyTitle}>Brak pomiarów</Text>
							<Text style={styles.emptyText}>Dodaj pierwszy pomiar, aby śledzić swoje postępy</Text>
							<TouchableOpacity style={styles.addFirstButton} onPress={() => setShowAddModal(true)}>
								<Ionicons name="add" size={20} color={colors.textOnPrimary} />
								<Text style={styles.addFirstButtonText}>Dodaj pomiar</Text>
							</TouchableOpacity>
						</View>
					) : (
						measurements.map(measurement => (
							<MeasurementCard
								key={measurement.id}
								measurement={measurement}
								onDelete={() => handleDeleteMeasurement(measurement.id)}
							/>
						))
					)}
				</View>
			</ScrollView>

			{/* FAB */}
			{measurements.length > 0 && (
				<TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
					<Ionicons name="add" size={28} color={colors.textOnPrimary} />
				</TouchableOpacity>
			)}

			{/* Modal dodawania */}
			<AddMeasurementModal
				visible={showAddModal}
				onClose={() => setShowAddModal(false)}
				onSave={handleAddMeasurement}
				isSaving={addMeasurement.isPending}
			/>
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
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingBottom: 100,
	},
	header: {
		padding: 20,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: 'bold',
		color: colors.textPrimary,
	},
	// Reminder
	reminderBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: colors.surface,
		marginHorizontal: 16,
		marginBottom: 16,
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.primary + '40',
	},
	reminderBannerUrgent: {
		borderColor: colors.warning,
		backgroundColor: colors.warning + '10',
	},
	reminderContent: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 12,
	},
	reminderText: {
		flex: 1,
		fontSize: 14,
		color: colors.textPrimary,
		fontWeight: '500',
	},
	reminderButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
	},
	// Comparison
	comparisonSection: {
		marginHorizontal: 16,
		marginBottom: 20,
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 16,
	},
	comparisonHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 4,
	},
	comparisonPeriod: {
		fontSize: 12,
		color: colors.textSecondary,
		marginBottom: 14,
	},
	comparisonGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	comparisonCard: {
		width: '30%',
		backgroundColor: colors.background,
		borderRadius: 10,
		padding: 10,
		alignItems: 'center',
	},
	comparisonLabel: {
		fontSize: 11,
		color: colors.textSecondary,
		marginBottom: 4,
	},
	comparisonValue: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.textPrimary,
	},
	comparisonChange: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		backgroundColor: colors.surface,
		gap: 2,
	},
	comparisonChangeGood: {
		backgroundColor: colors.success + '20',
	},
	comparisonChangeBad: {
		backgroundColor: colors.error + '20',
	},
	comparisonChangeText: {
		fontSize: 11,
		color: colors.textSecondary,
	},
	comparisonChangeTextGood: {
		color: colors.success,
	},
	comparisonChangeTextBad: {
		color: colors.error,
	},
	// Section
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	// Measurements
	measurementsSection: {
		paddingHorizontal: 16,
	},
	addButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
	},
	measurementCard: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 14,
		marginBottom: 10,
	},
	measurementHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	measurementDate: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	measurementGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	measurementItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.background,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
		gap: 6,
	},
	measurementLabel: {
		fontSize: 11,
		color: colors.textSecondary,
	},
	measurementValue: {
		fontSize: 13,
		fontWeight: '500',
		color: colors.textPrimary,
	},
	measurementNotes: {
		fontSize: 13,
		color: colors.textSecondary,
		fontStyle: 'italic',
		marginTop: 10,
	},
	// Empty
	emptyState: {
		alignItems: 'center',
		paddingVertical: 60,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
		marginTop: 16,
	},
	emptyText: {
		fontSize: 14,
		color: colors.textSecondary,
		textAlign: 'center',
		marginTop: 8,
		marginHorizontal: 40,
	},
	addFirstButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.primary,
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 10,
		marginTop: 24,
		gap: 8,
	},
	addFirstButtonText: {
		color: colors.textOnPrimary,
		fontWeight: '600',
	},
	fab: {
		position: 'absolute',
		right: 20,
		bottom: 30,
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
	// Modal
	modalContainer: {
		flex: 1,
		backgroundColor: colors.background,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.surface,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	saveText: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.primary,
	},
	modalScroll: {
		flex: 1,
	},
	modalContent: {
		padding: 16,
	},
	inputGroupTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.textSecondary,
		marginTop: 16,
		marginBottom: 10,
	},
	inputRow: {
		flexDirection: 'row',
		gap: 12,
	},
	inputWrapper: {
		flex: 1,
		marginBottom: 12,
	},
	inputLabel: {
		fontSize: 12,
		color: colors.textSecondary,
		marginBottom: 6,
	},
	input: {
		backgroundColor: colors.surface,
		borderRadius: 10,
		padding: 14,
		color: colors.textPrimary,
		fontSize: 15,
	},
	notesInputField: {
		minHeight: 80,
		textAlignVertical: 'top',
	},
})
