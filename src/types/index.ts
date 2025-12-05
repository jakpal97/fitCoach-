/**
 * Typy i interfejsy aplikacji FitCoach
 * 
 * Centralny plik z definicjami TypeScript dla całej aplikacji.
 * Typy są zsynchronizowane ze schematem bazy danych Supabase.
 */

// ============================================
// TYPY POMOCNICZE (Utility Types)
// ============================================

/**
 * ID bazodanowe - zawsze UUID string
 */
export type DatabaseId = string;

/**
 * Timestamp z bazy danych
 */
export type Timestamp = string;

/**
 * Nullable type helper
 */
export type Nullable<T> = T | null;

// ============================================
// UŻYTKOWNICY I PROFILE
// ============================================

/**
 * Role użytkowników w systemie
 */
export type UserRole = 'client' | 'trainer' | 'admin';

/**
 * Podstawowe dane użytkownika z Supabase Auth
 */
export interface User {
  id: DatabaseId;
  email: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Profil użytkownika - rozszerzenie danych auth
 */
export interface Profile {
  id: DatabaseId;
  user_id: DatabaseId;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  avatar_url: Nullable<string>;
  phone: Nullable<string>;
  /** ID trenera przypisanego do klienta (tylko dla role='client') */
  trainer_id: Nullable<DatabaseId>;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Dane specyficzne dla klienta
 */
export interface ClientData {
  id: DatabaseId;
  user_id: DatabaseId;
  /** Data urodzenia */
  date_of_birth: Nullable<string>;
  /** Płeć: 'male' | 'female' | 'other' */
  gender: Nullable<'male' | 'female' | 'other'>;
  /** Wzrost w cm */
  height_cm: Nullable<number>;
  /** Aktualna waga w kg */
  current_weight_kg: Nullable<number>;
  /** Docelowa waga w kg */
  target_weight_kg: Nullable<number>;
  /** Cel treningowy */
  fitness_goal: Nullable<string>;
  /** Poziom doświadczenia */
  experience_level: Nullable<'beginner' | 'intermediate' | 'advanced'>;
  /** Ograniczenia zdrowotne / kontuzje */
  health_notes: Nullable<string>;
  /** Czy zaakceptował regulamin */
  accepted_terms: boolean;
  /** Czy zaakceptował politykę prywatności */
  accepted_privacy: boolean;
  /** Data akceptacji regulaminu */
  terms_accepted_at: Nullable<Timestamp>;
  /** Data akceptacji polityki prywatności */
  privacy_accepted_at: Nullable<Timestamp>;
  /** Czy ukończył onboarding */
  onboarding_completed: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================
// ĆWICZENIA (Exercises)
// ============================================

/**
 * Kategorie ćwiczeń
 */
export type ExerciseCategory = 'strength' | 'cardio' | 'stretching' | 'core' | 'other';

/**
 * Poziomy trudności ćwiczeń
 */
export type ExerciseDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Grupy mięśniowe
 */
export type MuscleGroup = 
  | 'chest'      // klatka piersiowa
  | 'back'       // plecy
  | 'shoulders'  // barki
  | 'biceps'     // biceps
  | 'triceps'    // triceps
  | 'forearms'   // przedramiona
  | 'core'       // brzuch / core
  | 'glutes'     // pośladki
  | 'quadriceps' // czworogłowe
  | 'hamstrings' // dwugłowe uda
  | 'calves'     // łydki
  | 'full_body'; // całe ciało

/**
 * Ćwiczenie w bibliotece
 */
export interface Exercise {
  id: DatabaseId;
  /** ID trenera który stworzył ćwiczenie */
  trainer_id: DatabaseId;
  /** Nazwa ćwiczenia */
  name: string;
  /** Kategoria ćwiczenia */
  category: ExerciseCategory;
  /** Grupy mięśniowe (tablica) */
  muscle_groups: MuscleGroup[];
  /** Poziom trudności */
  difficulty: ExerciseDifficulty;
  /** Opis wykonania */
  description: Nullable<string>;
  /** Wskazówki / tips */
  tips: Nullable<string>;
  /** Typowy zakres powtórzeń np. "8-12" */
  typical_reps: Nullable<string>;
  /** Zalecany czas odpoczynku w sekundach */
  rest_seconds: Nullable<number>;
  /** URL do filmu demonstracyjnego */
  video_url: Nullable<string>;
  /** URL do miniaturki filmu */
  thumbnail_url: Nullable<string>;
  /** Czy ćwiczenie jest aktywne */
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Dane formularza do tworzenia/edycji ćwiczenia
 */
export interface ExerciseFormData {
  name: string;
  category: ExerciseCategory;
  muscle_groups: MuscleGroup[];
  difficulty: ExerciseDifficulty;
  description?: string;
  tips?: string;
  typical_reps?: string;
  rest_seconds?: number;
  /** URI lokalnego pliku video (przed uploadem) */
  video_uri?: string;
}

/**
 * Filtry do wyszukiwania ćwiczeń
 */
export interface ExerciseFilters {
  search?: string;
  category?: ExerciseCategory;
  difficulty?: ExerciseDifficulty;
  muscle_group?: MuscleGroup;
}

// ============================================
// PLANY TRENINGOWE
// ============================================

/**
 * Plan treningowy na tydzień
 */
export interface TrainingPlan {
  id: DatabaseId;
  /** ID klienta dla którego jest plan */
  client_id: DatabaseId;
  /** ID trenera który stworzył plan */
  trainer_id: DatabaseId;
  /** Data rozpoczęcia tygodnia (poniedziałek) */
  week_start: string;
  /** Data zakończenia tygodnia (niedziela) */
  week_end: string;
  /** Notatki trenera do planu */
  trainer_notes: Nullable<string>;
  /** Czy plan jest aktywny */
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  /** Relacja: dni treningowe */
  workout_days?: WorkoutDay[];
}

/**
 * Dzień treningowy w planie
 */
export interface WorkoutDay {
  id: DatabaseId;
  /** ID planu treningowego */
  plan_id: DatabaseId;
  /** Dzień tygodnia (0 = poniedziałek, 6 = niedziela) */
  day_of_week: number;
  /** Nazwa dnia np. "Dzień A - Klatka i Triceps" */
  name: Nullable<string>;
  /** Czy to dzień odpoczynku */
  is_rest_day: boolean;
  /** Kolejność wyświetlania */
  order_index: number;
  created_at: Timestamp;
  /** Relacja: ćwiczenia w tym dniu */
  exercises?: WorkoutExercise[];
}

/**
 * Ćwiczenie w dniu treningowym
 */
export interface WorkoutExercise {
  id: DatabaseId;
  /** ID dnia treningowego */
  workout_day_id: DatabaseId;
  /** ID ćwiczenia z biblioteki */
  exercise_id: DatabaseId;
  /** Liczba serii */
  sets: number;
  /** Powtórzenia (może być zakres np. "10-12") */
  reps: string;
  /** Obciążenie w kg */
  weight_kg: Nullable<number>;
  /** Czas odpoczynku w sekundach */
  rest_seconds: number;
  /** Notatki trenera do tego ćwiczenia */
  notes: Nullable<string>;
  /** Kolejność w dniu */
  order_index: number;
  created_at: Timestamp;
  /** Relacja: dane ćwiczenia */
  exercise?: Exercise;
}

/**
 * Dane formularza do dodawania ćwiczenia do planu
 */
export interface WorkoutExerciseFormData {
  exercise_id: DatabaseId;
  sets: number;
  reps: string;
  weight_kg?: number;
  rest_seconds: number;
  notes?: string;
}

// ============================================
// UKOŃCZONE TRENINGI
// ============================================

/**
 * Status ukończenia treningu
 */
export type WorkoutStatus = 'completed' | 'partial' | 'skipped';

/**
 * Ukończony trening
 */
export interface CompletedWorkout {
  id: DatabaseId;
  /** ID użytkownika (klienta) */
  user_id: DatabaseId;
  /** ID dnia treningowego */
  workout_day_id: DatabaseId;
  /** Data wykonania treningu */
  completed_date: string;
  /** Status ukończenia */
  status: WorkoutStatus;
  /** Czas trwania treningu w minutach */
  duration_minutes: Nullable<number>;
  /** Notatki klienta */
  client_notes: Nullable<string>;
  /** Ocena samopoczucia (1-5) */
  feeling_rating: Nullable<number>;
  created_at: Timestamp;
  /** Relacja: ukończone ćwiczenia */
  completed_exercises?: CompletedExercise[];
}

/**
 * Ukończone ćwiczenie
 */
export interface CompletedExercise {
  id: DatabaseId;
  /** ID ukończonego treningu */
  completed_workout_id: DatabaseId;
  /** ID ćwiczenia w planie */
  workout_exercise_id: DatabaseId;
  /** Czy ćwiczenie zostało wykonane */
  is_completed: boolean;
  /** Faktyczna liczba wykonanych serii */
  actual_sets: Nullable<number>;
  /** Faktyczne powtórzenia */
  actual_reps: Nullable<string>;
  /** Faktyczne obciążenie */
  actual_weight_kg: Nullable<number>;
  /** Notatki do ćwiczenia */
  notes: Nullable<string>;
  created_at: Timestamp;
}

// ============================================
// POMIARY I POSTĘPY
// ============================================

/**
 * Pomiar / wpis postępu
 */
export interface Measurement {
  id: DatabaseId;
  /** ID użytkownika */
  user_id: DatabaseId;
  /** Data pomiaru */
  measurement_date: string;
  /** Waga w kg */
  weight_kg: Nullable<number>;
  /** Procent tkanki tłuszczowej */
  body_fat_percentage: Nullable<number>;
  /** Obwód brzucha w cm */
  waist_cm: Nullable<number>;
  /** Obwód klatki piersiowej w cm */
  chest_cm: Nullable<number>;
  /** Obwód ramienia w cm */
  arm_cm: Nullable<number>;
  /** Obwód uda w cm */
  thigh_cm: Nullable<number>;
  /** Notatki */
  notes: Nullable<string>;
  created_at: Timestamp;
  updated_at: Timestamp;
  /** Relacja: zdjęcia postępu */
  progress_photos?: ProgressPhoto[];
}

/**
 * Typ zdjęcia postępu
 */
export type ProgressPhotoType = 'front' | 'side' | 'back';

/**
 * Zdjęcie postępu
 */
export interface ProgressPhoto {
  id: DatabaseId;
  /** ID pomiaru */
  measurement_id: DatabaseId;
  /** URL zdjęcia w Storage */
  photo_url: string;
  /** Typ zdjęcia (przód, bok, tył) */
  photo_type: ProgressPhotoType;
  created_at: Timestamp;
}

/**
 * Dane formularza pomiaru
 */
export interface MeasurementFormData {
  measurement_date: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  waist_cm?: number;
  chest_cm?: number;
  arm_cm?: number;
  thigh_cm?: number;
  notes?: string;
  /** Lokalne URI zdjęć do uploadu */
  photos?: {
    front?: string;
    side?: string;
    back?: string;
  };
}

// ============================================
// DIETA
// ============================================

/**
 * Plan dietetyczny
 */
export interface DietPlan {
  id: DatabaseId;
  /** ID klienta */
  client_id: DatabaseId;
  /** ID trenera */
  trainer_id: DatabaseId;
  /** Tytuł planu */
  title: string;
  /** Opis planu */
  description: Nullable<string>;
  /** URL do pliku PDF */
  file_url: Nullable<string>;
  /** Data rozpoczęcia */
  start_date: Nullable<string>;
  /** Data zakończenia */
  end_date: Nullable<string>;
  /** Czy plan jest aktywny */
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================
// WIADOMOŚCI (Chat)
// ============================================

/**
 * Wiadomość w czacie
 */
export interface Message {
  id: DatabaseId;
  /** ID nadawcy */
  sender_id: DatabaseId;
  /** ID odbiorcy */
  receiver_id: DatabaseId;
  /** Treść wiadomości */
  content: string;
  /** Czy wiadomość została przeczytana */
  is_read: boolean;
  /** Data przeczytania */
  read_at: Nullable<Timestamp>;
  created_at: Timestamp;
  /** Relacja: profil nadawcy */
  sender?: Profile;
  /** Relacja: profil odbiorcy */
  receiver?: Profile;
}

/**
 * Dane formularza wiadomości
 */
export interface MessageFormData {
  receiver_id: DatabaseId;
  content: string;
}

// ============================================
// POWIADOMIENIA
// ============================================

/**
 * Typ powiadomienia
 */
export type NotificationType = 
  | 'new_plan'          // nowy plan treningowy
  | 'workout_reminder'  // przypomnienie o treningu
  | 'new_message'       // nowa wiadomość
  | 'progress_update'   // aktualizacja postępów
  | 'trainer_feedback'; // feedback od trenera

/**
 * Token powiadomień push
 */
export interface NotificationToken {
  id: DatabaseId;
  user_id: DatabaseId;
  /** Token Expo Push */
  expo_push_token: string;
  /** Platforma: 'ios' | 'android' */
  platform: 'ios' | 'android';
  /** Czy token jest aktywny */
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Powiadomienie
 */
export interface Notification {
  id: DatabaseId;
  user_id: DatabaseId;
  /** Typ powiadomienia */
  type: NotificationType;
  /** Tytuł powiadomienia */
  title: string;
  /** Treść powiadomienia */
  body: string;
  /** Dodatkowe dane (JSON) */
  data: Nullable<Record<string, unknown>>;
  /** Czy przeczytane */
  is_read: boolean;
  created_at: Timestamp;
}

// ============================================
// TYPY DLA UI / KOMPONENTÓW
// ============================================

/**
 * Status treningu klienta na dany dzień (dla Dashboard trenera)
 */
export type ClientWorkoutStatus = 'completed' | 'in_progress' | 'not_started' | 'missed' | 'no_plan';

/**
 * Klient z statusem treningu (dla Dashboard)
 */
export interface ClientWithStatus extends Profile {
  workout_status: ClientWorkoutStatus;
  /** Procent ukończenia (0-100) */
  completion_percentage: number;
  /** Godzina ukończenia (jeśli completed) */
  completed_at?: string;
}

/**
 * Statystyki dashboardu trenera
 */
export interface TrainerDashboardStats {
  total_clients: number;
  completed_today: number;
  in_progress_today: number;
  missed_today: number;
}

/**
 * Dane postępu dla wykresów
 */
export interface ProgressChartData {
  date: string;
  weight_kg?: number;
  body_fat_percentage?: number;
}

// ============================================
// TYPY API RESPONSES
// ============================================

/**
 * Standardowa odpowiedź API
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

/**
 * Odpowiedź z paginacją
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// ============================================
// EKSPORT WSZYSTKICH TYPÓW
// ============================================

export type {
  DatabaseId,
  Timestamp,
  Nullable,
};

