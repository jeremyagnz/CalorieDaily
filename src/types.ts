export type Sex = 'male' | 'female'
export type ActivityLevel =
  | 'sedentary'
  | 'lightlyActive'
  | 'moderatelyActive'
  | 'veryActive'
  | 'extremelyActive'
export type GoalType = 'maintain' | 'lose' | 'gain' | 'muscle'
export type ProgressSpeed = 'slow' | 'moderate' | 'fast'
export type WeightUnit = 'kg' | 'lb'
export type HeightUnit = 'cm' | 'ft'
export type ExerciseIntensity = 'low' | 'moderate' | 'high'
export type ExerciseType =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'weights'
  | 'football'
  | 'basketball'
  | 'hiit'
  | 'treadmill'
  | 'elliptical'
  | 'stairs'
  | 'other'

export type UserProfile = {
  age: number
  sex: Sex
  weightKg: number
  heightCm: number
  activityLevel: ActivityLevel
  goal: GoalType
  targetWeightKg: number
  progressSpeed: ProgressSpeed
  preferredWeightUnit: WeightUnit
  preferredHeightUnit: HeightUnit
}

export type StrategyOption = {
  id: string
  title: string
  description: string
  intake: number
  exerciseBurn: number
  totalDelta: number
  recommended?: boolean
}

export type DailyPlan = {
  bmr: number
  tdee: number
  bmi: number
  bmiCategory: string
  targetCalories: number
  recommendedIntake: number
  recommendedExerciseBurn: number
  foodDelta: number
  totalDelta: number
  deficit: number
  surplus: number
  targetWeightKg: number
  warning?: string
  goalSummary: string
  strategies: StrategyOption[]
}

export type ExerciseEntry = {
  id: string
  date: string
  type: ExerciseType
  durationMinutes: number
  intensity: ExerciseIntensity
  distanceKm?: number
  caloriesBurned: number
}

export type DailyLog = {
  date: string
  caloriesConsumed: number
}

export type WeightEntry = {
  id: string
  date: string
  weightKg: number
}

export type AppState = {
  profile: UserProfile | null
  dailyLogs: Record<string, DailyLog>
  exerciseEntries: ExerciseEntry[]
  weightEntries: WeightEntry[]
}

export type EnergyHistoryEntry = {
  date: string
  label: string
  tdee: number
  consumed: number
  exerciseBurned: number
  totalDelta: number
  weightKg: number
  withinGoal: boolean
}
