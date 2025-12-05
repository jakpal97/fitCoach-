/**
 * ClientProgressScreen - Ekran postępów klienta
 *
 * Wyświetla pomiary, statystyki i historię treningów.
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
	useMeasurementStats,
	useAddMeasurement,
	useDeleteMeasurement,
	type Measurement,
	type MeasurementInput,
} from '../../api/services/measurements'
import { colors } from '../../theme/colors'

// ============================================
// KOMPONENT KARTY STATYSTYKI
// ============================================

interface StatCardProps {
	icon: string
	label: string
	value: string | number | undefined
	change?: number
	unit?: string
}

function StatCard({ icon, label, value, change, unit = '' }: StatCardProps) {
	const isPositive = change && change > 0
	const isNegative = change && change < 0

	return (
		<View style={styles.statCard}>
			<Ionicons name={icon as any} size={24} color={colors.primary} />
			<Text style={styles.statValue}>{value !== undefined ? `${value}${unit}` : '-'}</Text>
			<Text style={styles.statLabel}>{label}</Text>
			{change !== undefined && (
				<View
					style={[
						styles.changeBadge,
						isPositive && styles.changeBadgePositive,
						isNegative && styles.changeBadgeNegative,
					]}>
					<Ionicons
						name={isPositive ? 'arrow-up' : isNegative ? 'arrow-down' : 'remove'}
						size={12}
						color={isPositive ? colors.error : isNegative ? colors.success : colors.textSecondary}
					/>
					<Text
						style={[
							styles.changeText,
							isPositive && styles.changeTextPositive,
							isNegative && styles.changeTextNegative,
						]}>
						{Math.abs(change).toFixed(1)}
						{unit}
					</Text>
				</View>
			)}
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
	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString('pl-PL', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		})
	}

	const handleLongPress = () => {
		Alert.alert('Usuń pomiar', 'Czy na pewno chcesz usunąć ten pomiar?', [
			{ text: 'Anuluj', style: 'cancel' },
			{ text: 'Usuń', style: 'destructive', onPress: onDelete },
		])
	}

	return (
		<TouchableOpacity style={styles.measurementCard} onLongPress={handleLongPress} activeOpacity={0.7}>
			<View style={styles.measurementHeader}>
				<Text style={styles.measurementDate}>{formatDate(measurement.measurement_date)}</Text>
				<TouchableOpacity onPress={handleLongPress}>
					<Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
				</TouchableOpacity>
			</View>

			<View style={styles.measurementGrid}>
				{measurement.weight_kg && (
					<View style={styles.measurementItem}>
						<Ionicons name="scale-outline" size={16} color={colors.primary} />
						<Text style={styles.measurementValue}>{measurement.weight_kg} kg</Text>
					</View>
				)}
				{measurement.body_fat_percent && (
					<View style={styles.measurementItem}>
						<Ionicons name="body-outline" size={16} color={colors.warning} />
						<Text style={styles.measurementValue}>{measurement.body_fat_percent}%</Text>
					</View>
				)}
				{measurement.chest_cm && (
					<View style={styles.measurementItem}>
						<Text style={styles.measurementLabel}>Klatka</Text>
						<Text style={styles.measurementValue}>{measurement.chest_cm} cm</Text>
					</View>
				)}
				{measurement.waist_cm && (
					<View style={styles.measurementItem}>
						<Text style={styles.measurementLabel}>Talia</Text>
						<Text style={styles.measurementValue}>{measurement.waist_cm} cm</Text>
					</View>
				)}
				{measurement.hips_cm && (
					<View style={styles.measurementItem}>
						<Text style={styles.measurementLabel}>Biodra</Text>
						<Text style={styles.measurementValue}>{measurement.hips_cm} cm</Text>
					</View>
				)}
				{measurement.biceps_left_cm && (
					<View style={styles.measurementItem}>
						<Text style={styles.measurementLabel}>Biceps L</Text>
						<Text style={styles.measurementValue}>{measurement.biceps_left_cm} cm</Text>
					</View>
				)}
				{measurement.biceps_right_cm && (
					<View style={styles.measurementItem}>
						<Text style={styles.measurementLabel}>Biceps P</Text>
						<Text style={styles.measurementValue}>{measurement.biceps_right_cm} cm</Text>
					</View>
				)}
				{measurement.thigh_left_cm && (
					<View style={styles.measurementItem}>
						<Text style={styles.measurementLabel}>Udo L</Text>
						<Text style={styles.measurementValue}>{measurement.thigh_left_cm} cm</Text>
					</View>
				)}
				{measurement.thigh_right_cm && (
					<View style={styles.measurementItem}>
						<Text style={styles.measurementLabel}>Udo P</Text>
						<Text style={styles.measurementValue}>{measurement.thigh_right_cm} cm</Text>
					</View>
				)}
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
	const { data: stats } = useMeasurementStats(userId)
	const addMeasurement = useAddMeasurement()
	const deleteMeasurement = useDeleteMeasurement()

	const [showAddModal, setShowAddModal] = useState(false)

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

				{/* Statystyki */}
				{stats && stats.measurementCount > 0 && (
					<View style={styles.statsSection}>
						<Text style={styles.sectionTitle}>Podsumowanie</Text>
						<View style={styles.statsRow}>
							<StatCard icon="scale" label="Waga" value={stats.currentWeight} change={stats.weightChange} unit=" kg" />
							<StatCard
								icon="body"
								label="Tk. tłuszcz."
								value={stats.currentBodyFat}
								change={stats.bodyFatChange}
								unit="%"
							/>
							<StatCard icon="calendar" label="Pomiary" value={stats.measurementCount} />
						</View>
					</View>
				)}

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
	statsSection: {
		paddingHorizontal: 16,
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
		marginBottom: 12,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	statsRow: {
		flexDirection: 'row',
		gap: 12,
	},
	statCard: {
		flex: 1,
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 14,
		alignItems: 'center',
	},
	statValue: {
		fontSize: 20,
		fontWeight: 'bold',
		color: colors.textPrimary,
		marginTop: 8,
	},
	statLabel: {
		fontSize: 11,
		color: colors.textSecondary,
		marginTop: 4,
	},
	changeBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.background,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		marginTop: 6,
		gap: 2,
	},
	changeBadgePositive: {
		backgroundColor: colors.error + '20',
	},
	changeBadgeNegative: {
		backgroundColor: colors.success + '20',
	},
	changeText: {
		fontSize: 11,
		color: colors.textSecondary,
	},
	changeTextPositive: {
		color: colors.error,
	},
	changeTextNegative: {
		color: colors.success,
	},
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
	// Modal styles
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
