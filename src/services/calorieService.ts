import type {
  ActivityLevel,
  DailyPlan,
  GoalType,
  ProgressSpeed,
  StrategyOption,
  UserProfile,
  WeightUnit,
  HeightUnit,
} from '../types'

const activityFactors: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightlyActive: 1.375,
  moderatelyActive: 1.55,
  veryActive: 1.725,
  extremelyActive: 1.9,
}

const deficitTargets: Record<ProgressSpeed, number> = {
  slow: 250,
  moderate: 500,
  fast: 700,
}

const gainTargets: Record<ProgressSpeed, number> = {
  slow: 180,
  moderate: 300,
  fast: 450,
}

const muscleTargets: Record<ProgressSpeed, number> = {
  slow: 140,
  moderate: 220,
  fast: 320,
}

const exerciseShareByActivity: Record<ActivityLevel, number> = {
  sedentary: 0.22,
  lightlyActive: 0.28,
  moderatelyActive: 0.34,
  veryActive: 0.38,
  extremelyActive: 0.42,
}

const activityBurnBaseline: Record<ActivityLevel, number> = {
  sedentary: 120,
  lightlyActive: 140,
  moderatelyActive: 170,
  veryActive: 190,
  extremelyActive: 220,
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const roundTo25 = (value: number) => Math.round(value / 25) * 25

export function calculateDailyPlan(profile: UserProfile): DailyPlan {
  const bmrValue =
    10 * profile.weightKg +
    6.25 * profile.heightCm -
    5 * profile.age +
    (profile.sex === 'male' ? 5 : -161)
  const bmr = Math.round(bmrValue)
  const tdee = Math.round(bmr * activityFactors[profile.activityLevel])
  const bmi = profile.weightKg / (profile.heightCm / 100) ** 2
  const bmiCategory = getBmiCategory(bmi)
  const minimumIntake = profile.sex === 'male' ? 1500 : 1200
  const exerciseCap = roundTo25(clamp(profile.weightKg * 4.4, 120, 450))

  const desiredTotalDelta = getDesiredTotalDelta(profile.goal, profile.progressSpeed)
  let recommendedExerciseBurn = getExerciseRecommendation(
    profile.goal,
    desiredTotalDelta,
    profile.activityLevel,
    exerciseCap,
  )

  let totalDelta = desiredTotalDelta
  let foodDelta = totalDelta + recommendedExerciseBurn
  let recommendedIntake = tdee + foodDelta
  let warning = ''

  if (recommendedIntake < minimumIntake) {
    recommendedIntake = minimumIntake
    foodDelta = recommendedIntake - tdee
    totalDelta = foodDelta - recommendedExerciseBurn
    warning =
      'El plan pedido era muy agresivo, así que se ajustó a un rango más conservador. Si necesitas un enfoque más estricto, consulta con un profesional de salud.'
  }

  if (profile.goal === 'maintain') {
    recommendedExerciseBurn = activityBurnBaseline[profile.activityLevel]
    foodDelta = recommendedExerciseBurn
    totalDelta = 0
    recommendedIntake = tdee + recommendedExerciseBurn
  }

  const targetCalories = tdee + totalDelta
  const deficit = totalDelta < 0 ? Math.abs(totalDelta) : 0
  const surplus = totalDelta > 0 ? totalDelta : 0
  const strategies = buildStrategies({
    tdee,
    totalDelta,
    recommendedExerciseBurn,
    minimumIntake,
    goal: profile.goal,
  })

  return {
    bmr,
    tdee,
    bmi,
    bmiCategory,
    targetCalories,
    recommendedIntake,
    recommendedExerciseBurn,
    foodDelta,
    totalDelta,
    deficit,
    surplus,
    targetWeightKg: profile.targetWeightKg,
    warning,
    goalSummary: buildGoalSummary({
      tdee,
      recommendedIntake,
      recommendedExerciseBurn,
      totalDelta,
      goal: profile.goal,
    }),
    strategies,
  }
}

function getDesiredTotalDelta(goal: GoalType, speed: ProgressSpeed) {
  if (goal === 'lose') {
    return -deficitTargets[speed]
  }

  if (goal === 'gain') {
    return gainTargets[speed]
  }

  if (goal === 'muscle') {
    return muscleTargets[speed]
  }

  return 0
}

function getExerciseRecommendation(
  goal: GoalType,
  desiredTotalDelta: number,
  activityLevel: ActivityLevel,
  cap: number,
) {
  if (goal === 'lose') {
    return roundTo25(clamp(Math.abs(desiredTotalDelta) * exerciseShareByActivity[activityLevel], 100, cap))
  }

  if (goal === 'maintain') {
    return activityBurnBaseline[activityLevel]
  }

  return roundTo25(clamp(activityBurnBaseline[activityLevel] * 0.7, 75, 225))
}

function buildStrategies({
  tdee,
  totalDelta,
  recommendedExerciseBurn,
  minimumIntake,
  goal,
}: {
  tdee: number
  totalDelta: number
  recommendedExerciseBurn: number
  minimumIntake: number
  goal: GoalType
}) {
  const base = [
    {
      id: 'less-activity',
      title: 'Opción A — Menos ejercicio',
      description: 'Más apoyo desde la alimentación y menor volumen de actividad.',
      exerciseBurn: Math.max(75, roundTo25(recommendedExerciseBurn * 0.45)),
    },
    {
      id: 'balanced',
      title: 'Opción B — Equilibrado',
      description: 'Reparte la carga entre comida y movimiento.',
      exerciseBurn: recommendedExerciseBurn,
      recommended: true,
    },
    {
      id: 'more-activity',
      title: 'Opción C — Más actividad',
      description: 'Más flexibilidad para comer a cambio de moverte más.',
      exerciseBurn: roundTo25(recommendedExerciseBurn * 1.4),
    },
  ]

  return base.map<StrategyOption>((option) => {
    const intake = Math.max(minimumIntake, tdee + totalDelta + option.exerciseBurn)
    const adjustedTotal = intake - tdee - option.exerciseBurn

    return {
      ...option,
      intake,
      totalDelta: goal === 'maintain' ? 0 : adjustedTotal,
    }
  })
}

function buildGoalSummary({
  tdee,
  recommendedIntake,
  recommendedExerciseBurn,
  totalDelta,
  goal,
}: {
  tdee: number
  recommendedIntake: number
  recommendedExerciseBurn: number
  totalDelta: number
  goal: GoalType
}) {
  const balanceLabel =
    totalDelta < 0
      ? `un déficit diario estimado de ${formatCalories(Math.abs(totalDelta))}`
      : totalDelta > 0
        ? `un superávit diario estimado de ${formatCalories(totalDelta)}`
        : 'un balance diario neutro'

  if (goal === 'maintain') {
    return `Tu cuerpo gasta aproximadamente ${formatCalories(
      tdee,
    )} al día. Para mantenerte, consume cerca de ${formatCalories(
      recommendedIntake,
    )} si completas unas ${formatCalories(recommendedExerciseBurn)} de actividad.`
  }

  return `Tu cuerpo gasta aproximadamente ${formatCalories(
    tdee,
  )} al día. Para avanzar hacia tu objetivo, consume cerca de ${formatCalories(
    recommendedIntake,
  )} y complementa con unas ${formatCalories(recommendedExerciseBurn)} de ejercicio para lograr ${balanceLabel}.`
}

function getBmiCategory(bmi: number) {
  if (bmi < 18.5) {
    return 'Bajo peso'
  }

  if (bmi < 25) {
    return 'Rango saludable'
  }

  if (bmi < 30) {
    return 'Sobrepeso'
  }

  return 'Obesidad'
}

export function formatCalories(value: number) {
  return `${Math.round(value).toLocaleString('es-ES')} kcal`
}

export function formatWeight(value: number, unit: WeightUnit, includeUnit = true) {
  const numericValue = unit === 'lb' ? value * 2.20462 : value
  const rendered = numericValue.toFixed(1)
  return includeUnit ? `${rendered} ${unit}` : rendered
}

export function formatHeight(valueCm: number, unit: HeightUnit) {
  if (unit === 'cm') {
    return `${valueCm.toFixed(0)} cm`
  }

  const totalInches = valueCm / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches - feet * 12)
  return `${feet} ft ${inches} in`
}
