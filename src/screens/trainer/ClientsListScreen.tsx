/**
 * ClientsListScreen - Lista klientów trenera
 *
 * Wyświetla wszystkich klientów ze statystykami i wyszukiwaniem.
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
	View,
	Text,
	TextInput,
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
import { useClientsWithStats, type ClientWithStats } from '../../api/services/clients'
import { colors } from '../../theme/colors'
import type { AppStackParamList } from '../../navigation/AppNavigator'

// ============================================
// KOMPONENT KARTY KLIENTA
// ============================================

interface ClientCardProps {
	client: ClientWithStats
	onPress: () => void
	onCreatePlan: () => void
}

function ClientCard({ client, onPress, onCreatePlan }: ClientCardProps) {
	// Formatuj datę ostatniego treningu
	const lastWorkoutText = client.last_workout_date
		? `Ostatni trening: ${new Date(client.last_workout_date).toLocaleDateString('pl-PL')}`
		: 'Brak ukończonych treningów'

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
				<Text style={styles.clientEmail}>{client.email}</Text>
				<Text style={styles.lastWorkout}>{lastWorkoutText}</Text>
			</View>

			{/* Statystyki */}
			<View style={styles.statsColumn}>
				<View style={styles.statItem}>
					<Ionicons name="fitness" size={14} color={colors.success} />
					<Text style={styles.statText}>{client.completed_workouts_count}</Text>
				</View>
				<View style={styles.statItem}>
					<Ionicons name="calendar" size={14} color={colors.primary} />
					<Text style={styles.statText}>{client.training_plans_count}</Text>
				</View>
				{!client.active_plan && (
					<TouchableOpacity
						style={styles.addPlanButton}
						onPress={(e) => {
							e.stopPropagation?.()
							onCreatePlan()
						}}>
						<Ionicons name="add" size={16} color={colors.primary} />
					</TouchableOpacity>
				)}
			</View>
		</TouchableOpacity>
	)
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function ClientsListScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const { profile } = useAuth()

	const [searchQuery, setSearchQuery] = useState('')

	const {
		data: clients,
		isLoading,
		isRefetching,
		refetch,
	} = useClientsWithStats(profile?.id || '')

	// Filtruj klientów po wyszukiwaniu
	const filteredClients = useMemo(() => {
		if (!clients) return []
		if (!searchQuery.trim()) return clients

		const query = searchQuery.toLowerCase().trim()
		return clients.filter(
			(client) =>
				client.first_name?.toLowerCase().includes(query) ||
				client.last_name?.toLowerCase().includes(query) ||
				client.email?.toLowerCase().includes(query)
		)
	}, [clients, searchQuery])

	// Statystyki
	const stats = useMemo(() => {
		if (!clients) return { total: 0, withPlan: 0, withoutPlan: 0 }

		return {
			total: clients.length,
			withPlan: clients.filter((c) => c.active_plan).length,
			withoutPlan: clients.filter((c) => !c.active_plan).length,
		}
	}, [clients])

	// ============================================
	// HANDLERS
	// ============================================

	const handleClientPress = useCallback(
		(clientId: string) => {
			navigation.navigate('ClientDetail', { clientId })
		},
		[navigation]
	)

	const handleCreatePlan = useCallback(
		(clientId: string) => {
			navigation.navigate('CreatePlan', { clientId })
		},
		[navigation]
	)

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

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Klienci</Text>
				<Text style={styles.headerSubtitle}>{stats.total} klientów</Text>
			</View>

			{/* Wyszukiwarka */}
			<View style={styles.searchContainer}>
				<Ionicons name="search" size={20} color={colors.textSecondary} />
				<TextInput
					style={styles.searchInput}
					placeholder="Szukaj klienta..."
					placeholderTextColor={colors.textSecondary}
					value={searchQuery}
					onChangeText={setSearchQuery}
				/>
				{searchQuery.length > 0 && (
					<TouchableOpacity onPress={() => setSearchQuery('')}>
						<Ionicons name="close-circle" size={20} color={colors.textSecondary} />
					</TouchableOpacity>
				)}
			</View>

			{/* Statystyki */}
			<View style={styles.statsContainer}>
				<View style={styles.statCard}>
					<Text style={[styles.statValue, { color: colors.success }]}>{stats.withPlan}</Text>
					<Text style={styles.statLabel}>Z planem</Text>
				</View>
				<View style={styles.statCard}>
					<Text style={[styles.statValue, { color: colors.warning }]}>{stats.withoutPlan}</Text>
					<Text style={styles.statLabel}>Bez planu</Text>
				</View>
			</View>

			{/* Lista klientów */}
			<FlatList
				data={filteredClients}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<ClientCard
						client={item}
						onPress={() => handleClientPress(item.id)}
						onCreatePlan={() => handleCreatePlan(item.id)}
					/>
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
						<Text style={styles.emptyTitle}>
							{searchQuery ? 'Nie znaleziono klientów' : 'Brak klientów'}
						</Text>
						<Text style={styles.emptySubtitle}>
							{searchQuery
								? 'Spróbuj innej frazy wyszukiwania'
								: 'Kliknij + aby dodać pierwszego klienta'}
						</Text>
					</View>
				}
			/>

			{/* FAB - Dodaj klienta */}
			<TouchableOpacity
				style={styles.fab}
				onPress={() => navigation.navigate('AddClient' as any)}
				activeOpacity={0.8}>
				<Ionicons name="person-add" size={24} color={colors.textOnPrimary} />
			</TouchableOpacity>
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
		paddingHorizontal: 20,
		paddingTop: 8,
		paddingBottom: 16,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: 'bold',
		color: colors.textPrimary,
	},
	headerSubtitle: {
		fontSize: 14,
		color: colors.textSecondary,
		marginTop: 4,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: 12,
		marginHorizontal: 16,
		paddingHorizontal: 14,
		height: 48,
		marginBottom: 16,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: colors.textPrimary,
		marginLeft: 10,
	},
	statsContainer: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		gap: 12,
		marginBottom: 16,
	},
	statCard: {
		flex: 1,
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
	},
	statValue: {
		fontSize: 28,
		fontWeight: 'bold',
	},
	statLabel: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 4,
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
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: colors.primary + '25',
		justifyContent: 'center',
		alignItems: 'center',
	},
	avatarText: {
		fontSize: 18,
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
	clientEmail: {
		fontSize: 13,
		color: colors.textSecondary,
		marginTop: 2,
	},
	lastWorkout: {
		fontSize: 12,
		color: colors.textTertiary,
		marginTop: 4,
	},
	statsColumn: {
		alignItems: 'flex-end',
		gap: 6,
	},
	statItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	statText: {
		fontSize: 13,
		color: colors.textSecondary,
		fontWeight: '500',
	},
	addPlanButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: colors.primary + '20',
		justifyContent: 'center',
		alignItems: 'center',
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
	fab: {
		position: 'absolute',
		right: 20,
		bottom: 100,
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
})

