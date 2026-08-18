import type { ExerciseIntensity, ExerciseType } from '../types'

export const EXERCISE_OPTIONS: Array<{ value: ExerciseType; label: string }> = [
  { value: 'walking', label: 'Caminar' },
  { value: 'running', label: 'Correr' },
  { value: 'cycling', label: 'Bicicleta' },
  { value: 'swimming', label: 'Natación' },
  { value: 'weights', label: 'Pesas' },
  { value: 'football', label: 'Fútbol' },
  { value: 'basketball', label: 'Baloncesto' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'treadmill', label: 'Caminadora' },
  { value: 'elliptical', label: 'Elíptica' },
  { value: 'stairs', label: 'Escaleras' },
  { value: 'other', label: 'Otra actividad' },
]

const metsByExercise: Record<ExerciseType, Record<ExerciseIntensity, number>> = {
  walking: { low: 2.8, moderate: 3.8, high: 4.8 },
  running: { low: 7, moderate: 9.8, high: 11.5 },
  cycling: { low: 4.5, moderate: 7, high: 10 },
  swimming: { low: 5.8, moderate: 8.3, high: 10 },
  weights: { low: 3.5, moderate: 5, high: 6 },
  football: { low: 6.5, moderate: 8.5, high: 10 },
  basketball: { low: 6.2, moderate: 8, high: 9.5 },
  hiit: { low: 7.5, moderate: 9.5, high: 11.5 },
  treadmill: { low: 4.2, moderate: 6, high: 8.3 },
  elliptical: { low: 4.8, moderate: 5.8, high: 7 },
  stairs: { low: 4.2, moderate: 8.8, high: 10.5 },
  other: { low: 3.5, moderate: 5, high: 7 },
}

export function estimateExerciseCalories({
  type,
  intensity,
  durationMinutes,
  distanceKm,
  weightKg,
}: {
  type: ExerciseType
  intensity: ExerciseIntensity
  durationMinutes: number
  distanceKm?: number
  weightKg: number
}) {
  const met = metsByExercise[type][intensity]
  const baseCalories = (met * 3.5 * weightKg * durationMinutes) / 200
  const distanceBoost =
    distanceKm && (type === 'walking' || type === 'running' || type === 'cycling')
      ? distanceKm * weightKg * 0.35
      : 0

  return Math.round(baseCalories + distanceBoost)
}
