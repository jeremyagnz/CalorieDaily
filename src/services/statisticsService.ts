import type { AppState, DailyPlan, EnergyHistoryEntry, UserProfile } from '../types'

export function getDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildEnergyHistory(
  appState: AppState,
  profile: UserProfile,
  plan: DailyPlan,
  range: 1 | 7 | 30,
) {
  return Array.from({ length: range }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (range - index - 1))
    const key = getDateKey(date)
    const exerciseBurned = appState.exerciseEntries
      .filter((entry) => entry.date === key)
      .reduce((total, entry) => total + entry.caloriesBurned, 0)
    const consumed = appState.dailyLogs[key]?.caloriesConsumed ?? 0
    const totalDelta = consumed - plan.tdee - exerciseBurned
    const weightKg = getWeightForDate(appState, profile, key)

    return {
      date: key,
      label: range === 1 ? 'Hoy' : key.slice(5),
      tdee: plan.tdee,
      consumed,
      exerciseBurned,
      totalDelta,
      weightKg,
      withinGoal: Math.abs(totalDelta - plan.totalDelta) <= 150,
    } satisfies EnergyHistoryEntry
  })
}

export function getTodaySummary(appState: AppState, profile: UserProfile, plan: DailyPlan, todayKey: string) {
  const todayExercises = appState.exerciseEntries.filter((entry) => entry.date === todayKey)
  const exerciseBurned = todayExercises.reduce((sum, entry) => sum + entry.caloriesBurned, 0)

  return {
    todayExercises,
    exerciseBurned,
    exerciseProgress: Math.min(100, Math.round((exerciseBurned / Math.max(plan.recommendedExerciseBurn, 1)) * 100)),
    currentWeightKg: getLatestWeightKg(appState, profile),
  }
}

export function getLatestWeightKg(appState: AppState, profile: UserProfile) {
  return appState.weightEntries.length ? appState.weightEntries[0].weightKg : profile.weightKg
}

export function buildWeightTrend(appState: AppState, profile: UserProfile, range: number) {
  return Array.from({ length: range }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (range - index - 1))
    const key = getDateKey(date)
    return {
      label: key.slice(5),
      weightKg: getWeightForDate(appState, profile, key),
    }
  })
}

export function calculateWeightProgress(appState: AppState, profile: UserProfile, currentWeightKg: number) {
  const sorted = [...appState.weightEntries].sort((left, right) => left.date.localeCompare(right.date))
  const initialWeightKg = sorted[0]?.weightKg ?? profile.weightKg
  const remainingKg = Math.abs(currentWeightKg - profile.targetWeightKg)
  const weeklyAverageKg =
    appState.weightEntries.slice(0, 7).reduce((total, entry) => total + entry.weightKg, 0) /
    Math.max(1, appState.weightEntries.slice(0, 7).length)

  const progressPercent = getProgressPercent(initialWeightKg, currentWeightKg, profile.targetWeightKg)
  const trendLabel =
    currentWeightKg < initialWeightKg
      ? 'Tendencia descendente'
      : currentWeightKg > initialWeightKg
        ? 'Tendencia ascendente'
        : 'Sin cambios relevantes'

  return {
    initialWeightKg,
    remainingKg,
    weeklyAverageKg,
    progressPercent,
    trendLabel,
  }
}

function getWeightForDate(appState: AppState, profile: UserProfile, date: string) {
  return appState.weightEntries.find((entry) => entry.date === date)?.weightKg ?? getLatestWeightKg(appState, profile)
}

function getProgressPercent(initialWeightKg: number, currentWeightKg: number, targetWeightKg: number) {
  const totalChangeNeeded = targetWeightKg - initialWeightKg
  if (totalChangeNeeded === 0) {
    return 100
  }

  const progress = ((currentWeightKg - initialWeightKg) / totalChangeNeeded) * 100
  return Math.max(0, Math.min(100, Math.round(progress)))
}
