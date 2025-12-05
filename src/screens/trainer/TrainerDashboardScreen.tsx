/**
 * TrainerDashboardScreen - Główny ekran trenera
 *
 * Wyświetla listę klientów z ich dzisiejszym statusem treningu.
 */

import React, { useMemo } from 'react'
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	RefreshControl,
	StyleSheet,
	ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../context/AuthContext'
import { useClientsTodayStatus, type ClientTodayStatus, type TodayWorkoutStatus } from '../../api/services/clients'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'
import MessageBadge from '../../components/common/MessageBadge'

// ============================================
// MAPOWANIA STATUSÓW
// ============================================

const statusConfig: Record<TodayWorkoutStatus, { icon: string; color: string; label: string }> = {
	completed: {
		icon: 'checkmark-circle',
		color: colors.success,
		label: 'Ukończony',
	},
	in_progress: {
		icon: 'time',
		color: colors.warning,
		label: 'W trakcie',
	},
	not_started: {
		icon: 'ellipse-outline',
		color: colors.textSecondary,
		label: 'Nie rozpoczęty',
	},
	rest_day: {
		icon: 'bed',
		color: colors.info,
		label: 'Odpoczynek',
	},
	no_plan: {
		icon: 'alert-circle-outline',
		color: colors.textTertiary,
		label: 'Brak planu',
	},
}

// ============================================
// KOMPONENT KARTY KLIENTA
// ============================================

interface ClientCardProps {
	item: ClientTodayStatus
	onPress: () => void
}

function ClientCard({ item, onPress }: ClientCardProps) {
	const { client, status, workout_name, completed_at } = item
	const config = statusConfig[status]

	// Formatuj godzinę ukończenia
	const completedTime = completed_at
		? new Date(completed_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
		: null

	return (
		<TouchableOpacity style={styles.clientCard} onPress={onPress} activeOpacity={0.7}>
			{/* Avatar */}
			<View style={styles.avatar}>
				<Text style={styles.avatarText}>
					{client.first_name?.[0]?.toUpperCase()}
					{client.last_name?.[0]?.toUpperCase()}
				</Text>
			</View>

			{/* Info */}
			<View style={styles.clientInfo}>
				<Text style={styles.clientName}>
					{client.first_name} {client.last_name}
				</Text>
				<Text style={styles.workoutName}>
					{workout_name || 'Brak zaplanowanego treningu'}
				</Text>
			</View>

			{/* Status */}
			<View style={styles.statusContainer}>
				<View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
					<Ionicons name={config.icon as any} size={16} color={config.color} />
					<Text style={[styles.statusText, { color: config.color }]}>
						{status === 'completed' && completedTime ? completedTime : config.label}
					</Text>
				</View>
			</View>
		</TouchableOpacity>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function TrainerDashboardScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const { profile } = useAuth()

	const {
		data: clientsStatus,
		isLoading,
		isRefetching,
		refetch,
	} = useClientsTodayStatus(profile?.id || '')

	// Oblicz statystyki
	const stats = useMemo(() => {
		if (!clientsStatus) return { total: 0, completed: 0, notStarted: 0, restDay: 0 }

		return {
			total: clientsStatus.length,
			completed: clientsStatus.filter((c) => c.status === 'completed').length,
			notStarted: clientsStatus.filter((c) => c.status === 'not_started').length,
			restDay: clientsStatus.filter((c) => c.status === 'rest_day').length,
		}
	}, [clientsStatus])

	// ============================================
	// HANDLERS
	// ============================================

	const handleClientPress = (clientId: string) => {
		navigation.navigate('ClientDetail', { clientId })
	}

	// ============================================
	// RENDER - LOADING
	// ============================================

	if (isLoading) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={styles.loadingText}>Ładowanie klientów...</Text>
				</View>
			</SafeAreaView>
		)
	}

	// ============================================
	// RENDER
	// ============================================

	const today = new Date().toLocaleDateString('pl-PL', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	})

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<View>
					<Text style={styles.greeting}>Cześć, {profile?.first_name}! 👋</Text>
					<Text style={styles.dateText}>{today}</Text>
				</View>
				<View style={styles.notificationButton}>
					<MessageBadge navigateToList />
				</View>
			</View>

			{/* Statystyki */}
			<View style={styles.statsContainer}>
				<View style={styles.statCard}>
					<Text style={styles.statValue}>{stats.total}</Text>
					<Text style={styles.statLabel}>Klientów</Text>
				</View>
				<View style={[styles.statCard, { backgroundColor: colors.success + '15' }]}>
					<Text style={[styles.statValue, { color: colors.success }]}>{stats.completed}</Text>
					<Text style={styles.statLabel}>Ukończone</Text>
				</View>
				<View style={[styles.statCard, { backgroundColor: colors.warning + '15' }]}>
					<Text style={[styles.statValue, { color: colors.warning }]}>{stats.notStarted}</Text>
					<Text style={styles.statLabel}>Czekają</Text>
				</View>
				<View style={[styles.statCard, { backgroundColor: colors.info + '15' }]}>
					<Text style={[styles.statValue, { color: colors.info }]}>{stats.restDay}</Text>
					<Text style={styles.statLabel}>Odpoczynek</Text>
				</View>
			</View>

			{/* Nagłówek listy */}
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>Dzisiejsze treningi</Text>
				<Text style={styles.sectionSubtitle}>{stats.total} klientów</Text>
			</View>

			{/* Lista klientów */}
			<FlatList
				data={clientsStatus || []}
				keyExtractor={(item) => item.client.id}
				renderItem={({ item }) => (
					<ClientCard item={item} onPress={() => handleClientPress(item.client.id)} />
				)}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={refetch}
						tintColor={colors.primary}
						colors={[colors.primary]}
					/>
				}
				ListEmptyComponent={
					<View style={styles.emptyContainer}>
						<Ionicons name="people-outline" size={64} color={colors.textSecondary} />
						<Text style={styles.emptyTitle}>Brak klientów</Text>
						<Text style={styles.emptySubtitle}>
							Dodaj klientów aby śledzić ich postępy
						</Text>
					</View>
				}
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
	loadingText: {
		color: colors.textSecondary,
		marginTop: 12,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingTop: 8,
		paddingBottom: 16,
	},
	greeting: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.textPrimary,
	},
	dateText: {
		fontSize: 14,
		color: colors.textSecondary,
		marginTop: 4,
		textTransform: 'capitalize',
	},
	notificationButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: colors.surface,
		justifyContent: 'center',
		alignItems: 'center',
	},
	statsContainer: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		gap: 8,
		marginBottom: 20,
	},
	statCard: {
		flex: 1,
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 12,
		alignItems: 'center',
	},
	statValue: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.textPrimary,
	},
	statLabel: {
		fontSize: 11,
		color: colors.textSecondary,
		marginTop: 2,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	sectionSubtitle: {
		fontSize: 14,
		color: colors.textSecondary,
	},
	listContent: {
		paddingHorizontal: 16,
		paddingBottom: 100,
	},
	clientCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 14,
		marginBottom: 10,
	},
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: colors.primary + '30',
		justifyContent: 'center',
		alignItems: 'center',
	},
	avatarText: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.primary,
	},
	clientInfo: {
		flex: 1,
		marginLeft: 12,
	},
	clientName: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.textPrimary,
	},
	workoutName: {
		fontSize: 13,
		color: colors.textSecondary,
		marginTop: 2,
	},
	statusContainer: {
		marginLeft: 8,
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		gap: 4,
	},
	statusText: {
		fontSize: 12,
		fontWeight: '500',
	},
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.textPrimary,
		marginTop: 16,
	},
	emptySubtitle: {
		fontSize: 14,
		color: colors.textSecondary,
		marginTop: 4,
		textAlign: 'center',
	},
})

