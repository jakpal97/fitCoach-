/**
 * Schematy walidacji Zod dla FitCoach
 *
 * Centralne miejsce dla wszystkich schematów walidacji formularzy.
 */

import { z } from 'zod'

// ============================================
// POMOCNICZE WALIDATORY
// ============================================

/**
 * Walidator email
 */
const emailSchema = z
	.string()
	.min(1, 'Email jest wymagany')
	.email('Nieprawidłowy format email')
	.transform((val) => val.toLowerCase().trim())

/**
 * Walidator hasła
 */
const passwordSchema = z
	.string()
	.min(1, 'Hasło jest wymagane')
	.min(6, 'Hasło musi mieć co najmniej 6 znaków')

/**
 * Walidator wymaganego tekstu
 */
const requiredString = (fieldName: string) =>
	z.string().min(1, `${fieldName} jest wymagane`)

/**
 * Walidator opcjonalnego tekstu
 */
const optionalString = z.string().optional().or(z.literal(''))

/**
 * Walidator dodatniej liczby
 */
const positiveNumber = (fieldName: string) =>
	z.number().positive(`${fieldName} musi być dodatnia`)

/**
 * Walidator opcjonalnej dodatniej liczby
 */
const optionalPositiveNumber = z
	.number()
	.positive()
	.optional()
	.or(z.literal(0))
	.or(z.undefined())

// ============================================
// SCHEMAT: LOGOWANIE
// ============================================

export const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
})

export type LoginFormData = z.infer<typeof loginSchema>

// ============================================
// SCHEMAT: REJESTRACJA
// ============================================

export const registerSchema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
		confirmPassword: z.string().min(1, 'Potwierdzenie hasła jest wymagane'),
		firstName: requiredString('Imię'),
		lastName: requiredString('Nazwisko'),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Hasła muszą być takie same',
		path: ['confirmPassword'],
	})

export type RegisterFormData = z.infer<typeof registerSchema>

// ============================================
// SCHEMAT: ĆWICZENIE
// ============================================

/**
 * Dozwolone kategorie ćwiczeń
 */
const exerciseCategorySchema = z.enum(['strength', 'cardio', 'stretching', 'core', 'other'], {
	errorMap: () => ({ message: 'Wybierz kategorię' }),
})

/**
 * Dozwolone poziomy trudności
 */
const exerciseDifficultySchema = z.enum(['easy', 'medium', 'hard'], {
	errorMap: () => ({ message: 'Wybierz poziom trudności' }),
})

/**
 * Dozwolone grupy mięśniowe
 */
const muscleGroupSchema = z.enum([
	'chest',
	'back',
	'shoulders',
	'biceps',
	'triceps',
	'forearms',
	'core',
	'glutes',
	'quadriceps',
	'hamstrings',
	'calves',
	'full_body',
])

export const exerciseSchema = z.object({
	name: requiredString('Nazwa ćwiczenia').max(100, 'Nazwa może mieć max 100 znaków'),
	category: exerciseCategorySchema,
	muscle_groups: z
		.array(muscleGroupSchema)
		.min(1, 'Wybierz co najmniej jedną grupę mięśniową'),
	difficulty: exerciseDifficultySchema,
	description: optionalString,
	tips: optionalString,
	typical_reps: optionalString,
	rest_seconds: z
		.number()
		.min(0, 'Czas odpoczynku nie może być ujemny')
		.max(600, 'Maksymalny czas odpoczynku to 10 minut')
		.optional()
		.or(z.undefined()),
})

export type ExerciseFormData = z.infer<typeof exerciseSchema>

// ============================================
// SCHEMAT: PLAN TRENINGOWY
// ============================================

export const trainingPlanSchema = z.object({
	client_id: requiredString('Klient'),
	week_start: z.string().min(1, 'Data rozpoczęcia jest wymagana'),
	trainer_notes: optionalString,
})

export type TrainingPlanFormData = z.infer<typeof trainingPlanSchema>

// ============================================
// SCHEMAT: ĆWICZENIE W PLANIE
// ============================================

export const workoutExerciseSchema = z.object({
	exercise_id: requiredString('Ćwiczenie'),
	sets: z
		.number()
		.min(1, 'Minimum 1 seria')
		.max(20, 'Maksimum 20 serii'),
	reps: requiredString('Powtórzenia'),
	weight_kg: optionalPositiveNumber,
	rest_seconds: z
		.number()
		.min(0, 'Czas odpoczynku nie może być ujemny')
		.max(600, 'Maksymalny czas odpoczynku to 10 minut'),
	notes: optionalString,
})

export type WorkoutExerciseFormData = z.infer<typeof workoutExerciseSchema>

// ============================================
// SCHEMAT: WIADOMOŚĆ
// ============================================

export const messageSchema = z.object({
	receiver_id: requiredString('Odbiorca'),
	content: requiredString('Treść wiadomości').max(2000, 'Wiadomość może mieć max 2000 znaków'),
})

export type MessageFormData = z.infer<typeof messageSchema>

// ============================================
// SCHEMAT: POMIAR
// ============================================

export const measurementSchema = z.object({
	measurement_date: z.string().min(1, 'Data pomiaru jest wymagana'),
	weight_kg: z
		.number()
		.min(20, 'Waga musi wynosić co najmniej 20 kg')
		.max(300, 'Waga nie może przekraczać 300 kg')
		.optional(),
	body_fat_percentage: z
		.number()
		.min(1, 'Procent tłuszczu musi wynosić co najmniej 1%')
		.max(60, 'Procent tłuszczu nie może przekraczać 60%')
		.optional(),
	waist_cm: optionalPositiveNumber,
	chest_cm: optionalPositiveNumber,
	arm_cm: optionalPositiveNumber,
	thigh_cm: optionalPositiveNumber,
	notes: optionalString,
})

export type MeasurementFormData = z.infer<typeof measurementSchema>

// ============================================
// SCHEMAT: PROFIL UŻYTKOWNIKA
// ============================================

export const profileSchema = z.object({
	first_name: requiredString('Imię').max(50, 'Imię może mieć max 50 znaków'),
	last_name: requiredString('Nazwisko').max(50, 'Nazwisko może mieć max 50 znaków'),
	phone: z
		.string()
		.regex(/^(\+48)?[0-9]{9}$/, 'Nieprawidłowy numer telefonu')
		.optional()
		.or(z.literal('')),
})

export type ProfileFormData = z.infer<typeof profileSchema>

// ============================================
// SCHEMAT: DANE KLIENTA
// ============================================

export const clientDataSchema = z.object({
	date_of_birth: optionalString,
	gender: z.enum(['male', 'female', 'other']).optional(),
	height_cm: z
		.number()
		.min(100, 'Wzrost musi wynosić co najmniej 100 cm')
		.max(250, 'Wzrost nie może przekraczać 250 cm')
		.optional(),
	current_weight_kg: z
		.number()
		.min(30, 'Waga musi wynosić co najmniej 30 kg')
		.max(300, 'Waga nie może przekraczać 300 kg')
		.optional(),
	target_weight_kg: z
		.number()
		.min(30, 'Waga docelowa musi wynosić co najmniej 30 kg')
		.max(200, 'Waga docelowa nie może przekraczać 200 kg')
		.optional(),
	fitness_goal: optionalString,
	experience_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
	health_notes: optionalString,
})

export type ClientDataFormData = z.infer<typeof clientDataSchema>

// ============================================
// EKSPORTY POMOCNICZE
// ============================================

export {
	emailSchema,
	passwordSchema,
	requiredString,
	optionalString,
	positiveNumber,
	optionalPositiveNumber,
	exerciseCategorySchema,
	exerciseDifficultySchema,
	muscleGroupSchema,
}

