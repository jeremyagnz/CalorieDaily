import { useMemo, useState } from 'react'
import './App.css'
import { EnergyFlowChart } from './components/EnergyFlowChart'
import { HistoryCalendar } from './components/HistoryCalendar'
import { MetricCard } from './components/MetricCard'
import { ProgressBar } from './components/ProgressBar'
import { TrendChart } from './components/TrendChart'
import {
  calculateDailyPlan,
  formatCalories,
  formatHeight,
  formatWeight,
} from './services/calorieService'
import {
  EXERCISE_OPTIONS,
  estimateExerciseCalories,
} from './services/exerciseService'
import { loadAppState, saveAppState } from './services/storageService'
import {
  buildEnergyHistory,
  buildWeightTrend,
  calculateWeightProgress,
  getDateKey,
  getLatestWeightKg,
  getTodaySummary,
} from './services/statisticsService'
import type {
  ActivityLevel,
  AppState,
  ExerciseEntry,
  ExerciseIntensity,
  ExerciseType,
  GoalType,
  HeightUnit,
  ProgressSpeed,
  Sex,
  UserProfile,
  WeightUnit,
} from './types'

type DateRange = 1 | 7 | 30

type OnboardingDraft = {
  age: number
  sex: Sex
  weightUnit: WeightUnit
  weightValue: number
  targetWeightValue: number
  heightUnit: HeightUnit
  heightCmValue: number
  heightFeet: number
  heightInches: number
  activityLevel: ActivityLevel
  goal: GoalType
  progressSpeed: ProgressSpeed
}

type ExerciseFormState = {
  type: ExerciseType
  durationMinutes: number
  intensity: ExerciseIntensity
  distanceKm: string
}

const ACTIVITY_OPTIONS: Array<{ value: ActivityLevel; label: string; description: string }> = [
  {
    value: 'sedentary',
    label: 'Sedentario',
    description: 'Poca actividad diaria y trabajo mayormente sentado.',
  },
  {
    value: 'lightlyActive',
    label: 'Poco activo',
    description: 'Movimiento ligero y ejercicio suave algunos días.',
  },
  {
    value: 'moderatelyActive',
    label: 'Moderadamente activo',
    description: 'Entrenamiento regular o buena actividad diaria.',
  },
  {
    value: 'veryActive',
    label: 'Muy activo',
    description: 'Entrenamientos intensos y vida físicamente demandante.',
  },
  {
    value: 'extremelyActive',
    label: 'Extremadamente activo',
    description: 'Alto volumen de entrenamiento o trabajo físico fuerte.',
  },
]

const GOAL_OPTIONS: Array<{ value: GoalType; label: string; description: string }> = [
  {
    value: 'maintain',
    label: 'Mantener peso',
    description: 'Equilibrar consumo y actividad para sostener tu peso actual.',
  },
  {
    value: 'lose',
    label: 'Perder peso',
    description: 'Crear un déficit controlado sin hacerlo extremo.',
  },
  {
    value: 'gain',
    label: 'Ganar peso',
    description: 'Aumentar calorías con un superávit progresivo.',
  },
  {
    value: 'muscle',
    label: 'Ganar masa muscular',
    description: 'Priorizar un superávit moderado y actividad útil para rendimiento.',
  },
]

const SPEED_OPTIONS: Array<{ value: ProgressSpeed; label: string; description: string }> = [
  { value: 'slow', label: 'Lenta', description: 'Progreso conservador y sostenible.' },
  { value: 'moderate', label: 'Moderada', description: 'Buen equilibrio entre resultados y adherencia.' },
  { value: 'fast', label: 'Rápida', description: 'Enfoque más agresivo con mayor vigilancia.' },
]

const stepLabels = [
  'Datos personales',
  'Peso y altura',
  'Nivel de actividad',
  'Objetivo',
  'Peso objetivo',
  'Velocidad deseada',
  'Resultado personalizado',
]

const defaultDraft: OnboardingDraft = {
  age: 30,
  sex: 'male',
  weightUnit: 'kg',
  weightValue: 80,
  targetWeightValue: 72,
  heightUnit: 'cm',
  heightCmValue: 175,
  heightFeet: 5,
  heightInches: 9,
  activityLevel: 'moderatelyActive',
  goal: 'lose',
  progressSpeed: 'moderate',
}

const defaultExerciseForm: ExerciseFormState = {
  type: 'walking',
  durationMinutes: 40,
  intensity: 'moderate',
  distanceKm: '',
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const kgToLb = (value: number) => value * 2.20462
const lbToKg = (value: number) => value / 2.20462
const cmToFeetAndInches = (value: number) => {
  const totalInches = value / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches - feet * 12)
  return inches === 12 ? { feet: feet + 1, inches: 0 } : { feet, inches }
}
const feetAndInchesToCm = (feet: number, inches: number) => (feet * 12 + inches) * 2.54

function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState())
  const [isEditingProfile, setIsEditingProfile] = useState(!loadAppState().profile)
  const [selectedRange, setSelectedRange] = useState<DateRange>(7)
  const [exerciseForm, setExerciseForm] = useState<ExerciseFormState>(defaultExerciseForm)
  const [weightEntryValue, setWeightEntryValue] = useState('')

  const profile = appState.profile
  const plan = useMemo(() => (profile ? calculateDailyPlan(profile) : null), [profile])
  const todayKey = getDateKey()
  const todayLog = appState.dailyLogs[todayKey]
  const todaySummary = profile && plan ? getTodaySummary(appState, profile, plan, todayKey) : null
  const currentWeightKg = profile ? getLatestWeightKg(appState, profile) : null
  const energyHistory = profile && plan ? buildEnergyHistory(appState, profile, plan, selectedRange) : []
  const weightTrend = profile ? buildWeightTrend(appState, profile, 30) : []
  const weightProgress = profile && currentWeightKg ? calculateWeightProgress(appState, profile, currentWeightKg) : null

  const updateAppState = (updater: (current: AppState) => AppState) => {
    setAppState((current) => {
      const next = updater(current)
      saveAppState(next)
      return next
    })
  }

  const handleProfileSave = (nextProfile: UserProfile) => {
    updateAppState((current) => {
      const next = {
        ...current,
        profile: nextProfile,
      }

      if (!next.weightEntries.length) {
        next.weightEntries = [
          {
            id: `weight-${Date.now()}`,
            date: todayKey,
            weightKg: nextProfile.weightKg,
          },
        ]
      }

      return next
    })
    setIsEditingProfile(false)
  }

  const handleConsumedCaloriesChange = (value: string) => {
    const caloriesConsumed = Number(value)

    if (!value) {
      updateAppState((current) => {
        const nextLogs = { ...current.dailyLogs }
        delete nextLogs[todayKey]
        return { ...current, dailyLogs: nextLogs }
      })
      return
    }

    updateAppState((current) => ({
      ...current,
      dailyLogs: {
        ...current.dailyLogs,
        [todayKey]: {
          date: todayKey,
          caloriesConsumed: Number.isFinite(caloriesConsumed) ? caloriesConsumed : 0,
        },
      },
    }))
  }

  const handleAddExercise = () => {
    if (!profile) {
      return
    }

    const caloriesBurned = estimateExerciseCalories({
      type: exerciseForm.type,
      intensity: exerciseForm.intensity,
      durationMinutes: exerciseForm.durationMinutes,
      distanceKm: exerciseForm.distanceKm ? Number(exerciseForm.distanceKm) : undefined,
      weightKg: currentWeightKg ?? profile.weightKg,
    })

    const entry: ExerciseEntry = {
      id: `exercise-${Date.now()}`,
      date: todayKey,
      type: exerciseForm.type,
      durationMinutes: exerciseForm.durationMinutes,
      intensity: exerciseForm.intensity,
      distanceKm: exerciseForm.distanceKm ? Number(exerciseForm.distanceKm) : undefined,
      caloriesBurned,
    }

    updateAppState((current) => ({
      ...current,
      exerciseEntries: [entry, ...current.exerciseEntries],
    }))

    setExerciseForm(defaultExerciseForm)
  }

  const handleAddWeightEntry = () => {
    if (!profile || !weightEntryValue) {
      return
    }

    const numericValue = Number(weightEntryValue)
    const weightKg =
      profile.preferredWeightUnit === 'lb' ? lbToKg(numericValue) : numericValue

    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      return
    }

    updateAppState((current) => ({
      ...current,
      weightEntries: [
        {
          id: `weight-${Date.now()}`,
          date: todayKey,
          weightKg,
        },
        ...current.weightEntries.filter((entry) => entry.date !== todayKey),
      ],
    }))
    setWeightEntryValue('')
  }

  if (!profile || isEditingProfile || !plan) {
    return (
      <main className="app-shell">
        <OnboardingFlow
          initialProfile={profile ?? null}
          onSave={handleProfileSave}
          onCancel={profile ? () => setIsEditingProfile(false) : undefined}
        />
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="hero-panel card hero-gradient">
        <div className="hero-copy">
          <span className="eyebrow">CalorieDaily</span>
          <h1>Tu asistente personal de gasto energético</h1>
          <p className="hero-text">
            Entiende en segundos cuánto gastar, cuánto comer y cuánta actividad te
            conviene hoy para acercarte a tu objetivo.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={() => setIsEditingProfile(true)}>
              Editar onboarding
            </button>
            <span className="hero-note">Tu plan está listo 🔥</span>
          </div>
        </div>
        <div className="hero-stats">
          <MetricCard
            title="🔥 Calorías objetivo"
            value={formatCalories(plan.targetCalories)}
            subtitle="Balance neto diario recomendado"
          />
          <MetricCard
            title="🍽️ Consumo recomendado"
            value={formatCalories(plan.recommendedIntake)}
            subtitle={`${plan.foodDelta <= 0 ? 'Déficit' : 'Superávit'} por alimentación ${formatCalories(
              Math.abs(plan.foodDelta),
            )}`}
          />
          <MetricCard
            title="🏃 Daily Burn Goal"
            value={formatCalories(plan.recommendedExerciseBurn)}
            subtitle="Actividad sugerida para hoy"
          />
          <MetricCard
            title="⚖️ IMC"
            value={plan.bmi.toFixed(1)}
            subtitle={plan.bmiCategory}
          />
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="card summary-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Resumen del día</span>
              <h2>Estado actual</h2>
            </div>
            <p className="muted-text">
            {formatWeight(currentWeightKg ?? profile.weightKg, profile.preferredWeightUnit)} → meta{' '}
              {formatWeight(plan.targetWeightKg, profile.preferredWeightUnit)}
            </p>
          </div>

          <div className="metrics-grid">
            <MetricCard
              title="🔥 Calorías objetivo"
              value={formatCalories(plan.recommendedIntake)}
              subtitle="Consumo recomendado para seguir tu plan"
              tone="accent"
            />
            <MetricCard
              title="🍽️ Calorías consumidas"
              value={formatCalories(todayLog?.caloriesConsumed ?? 0)}
              subtitle="Registra tu ingesta diaria"
            />
            <MetricCard
              title="🏃 Calorías quemadas"
              value={formatCalories(todaySummary?.exerciseBurned ?? 0)}
              subtitle="Actividad acumulada de hoy"
            />
            <MetricCard
              title="🎯 Meta de ejercicio"
              value={formatCalories(plan.recommendedExerciseBurn)}
              subtitle={`${todaySummary?.exerciseProgress ?? 0}% completado`}
            />
          </div>

          <div className="input-panel">
            <label className="field">
              <span>Calorías consumidas hoy</span>
              <input
                type="number"
                min="0"
                value={todayLog?.caloriesConsumed ?? ''}
                onChange={(event) => handleConsumedCaloriesChange(event.target.value)}
                placeholder={String(plan.recommendedIntake)}
              />
            </label>
            <div className="summary-highlight">
              <p className="muted-text">📊 Progreso del objetivo de ejercicio</p>
              <ProgressBar
                label={`${todaySummary?.exerciseBurned ?? 0} / ${plan.recommendedExerciseBurn} kcal`}
                value={todaySummary?.exerciseProgress ?? 0}
              />
            </div>
          </div>
        </div>

        <div className="card burn-goal-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Daily Burn Goal</span>
              <h2>Meta diaria inteligente</h2>
            </div>
            <p className="muted-text">{plan.goalSummary}</p>
          </div>

          <div className="burn-stack">
            <div className="burn-row">
              <span>TDEE</span>
              <strong>{formatCalories(plan.tdee)}</strong>
            </div>
            <div className="burn-row">
              <span>↓ Alimentación</span>
              <strong>{plan.foodDelta >= 0 ? '+' : '-'}{formatCalories(Math.abs(plan.foodDelta))}</strong>
            </div>
            <div className="burn-row">
              <span>↓ Ejercicio</span>
              <strong>-{formatCalories(plan.recommendedExerciseBurn)}</strong>
            </div>
            <div className="burn-row burn-total">
              <span>
                {plan.totalDelta <= 0 ? 'Déficit diario estimado' : 'Superávit diario estimado'}
              </span>
              <strong>{formatCalories(Math.abs(plan.totalDelta))}</strong>
            </div>
          </div>

          <div className="plan-metrics">
            <MetricCard title="🔥 BMR" value={formatCalories(plan.bmr)} subtitle="Energía en reposo" />
            <MetricCard title="⚡ TDEE" value={formatCalories(plan.tdee)} subtitle="Gasto total estimado" />
            <MetricCard
              title="📉 Déficit"
              value={formatCalories(plan.deficit)}
              subtitle="Aplicado cuando el objetivo es bajar"
            />
            <MetricCard
              title="📈 Superávit"
              value={formatCalories(plan.surplus)}
              subtitle="Aplicado cuando el objetivo es subir"
            />
          </div>

          {plan.warning ? <p className="warning-banner">{plan.warning}</p> : null}
          <p className="disclaimer">
            Las necesidades calóricas son estimaciones y pueden variar según metabolismo,
            composición corporal, actividad y otros factores.
          </p>
        </div>

        <div className="card strategies-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Estrategias</span>
              <h2>Elige el balance que mejor encaje contigo</h2>
            </div>
          </div>

          <div className="strategy-grid">
            {plan.strategies.map((strategy) => (
              <article className={`strategy-card ${strategy.recommended ? 'recommended' : ''}`} key={strategy.id}>
                <div className="strategy-header">
                  <h3>{strategy.title}</h3>
                  {strategy.recommended ? <span className="strategy-badge">Recomendada</span> : null}
                </div>
                <p>{strategy.description}</p>
                <dl className="strategy-stats">
                  <div>
                    <dt>Consumir</dt>
                    <dd>{formatCalories(strategy.intake)}</dd>
                  </div>
                  <div>
                    <dt>Ejercicio</dt>
                    <dd>{formatCalories(strategy.exerciseBurn)}</dd>
                  </div>
                  <div>
                    <dt>Balance</dt>
                    <dd>
                      {strategy.totalDelta <= 0 ? '-' : '+'}
                      {formatCalories(Math.abs(strategy.totalDelta))}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>

        <div className="card exercise-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Exercise</span>
              <h2>Registra actividad y sigue tu meta</h2>
            </div>
            <p className="muted-text">
              Quemadas: {formatCalories(todaySummary?.exerciseBurned ?? 0)} · Restantes:{' '}
              {formatCalories(clamp(plan.recommendedExerciseBurn - (todaySummary?.exerciseBurned ?? 0), 0, 9999))}
            </p>
          </div>

          <div className="exercise-layout">
            <div className="exercise-form">
              <label className="field">
                <span>Tipo</span>
                <select
                  value={exerciseForm.type}
                  onChange={(event) =>
                    setExerciseForm((current) => ({
                      ...current,
                      type: event.target.value as ExerciseType,
                    }))
                  }
                >
                  {EXERCISE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Duración (min)</span>
                <input
                  type="number"
                  min="5"
                  value={exerciseForm.durationMinutes}
                  onChange={(event) =>
                    setExerciseForm((current) => ({
                      ...current,
                      durationMinutes: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Intensidad</span>
                <select
                  value={exerciseForm.intensity}
                  onChange={(event) =>
                    setExerciseForm((current) => ({
                      ...current,
                      intensity: event.target.value as ExerciseIntensity,
                    }))
                  }
                >
                  <option value="low">Baja</option>
                  <option value="moderate">Moderada</option>
                  <option value="high">Alta</option>
                </select>
              </label>
              <label className="field">
                <span>Distancia (km, opcional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={exerciseForm.distanceKm}
                  onChange={(event) =>
                    setExerciseForm((current) => ({
                      ...current,
                      distanceKm: event.target.value,
                    }))
                  }
                />
              </label>
              <button type="button" className="primary-button" onClick={handleAddExercise}>
                Añadir ejercicio
              </button>
            </div>

            <div className="exercise-overview">
              <ProgressBar
                label={`Meta diaria: ${plan.recommendedExerciseBurn} kcal`}
                value={todaySummary?.exerciseProgress ?? 0}
              />
              <div className="entry-list">
                {todaySummary?.todayExercises.length ? (
                  todaySummary.todayExercises.map((entry) => (
                    <article className="entry-card" key={entry.id}>
                      <div>
                        <strong>{EXERCISE_OPTIONS.find((option) => option.value === entry.type)?.label}</strong>
                        <p>
                          {entry.durationMinutes} min · {entry.intensity === 'low'
                            ? 'Baja'
                            : entry.intensity === 'moderate'
                              ? 'Moderada'
                              : 'Alta'}
                          {entry.distanceKm ? ` · ${entry.distanceKm.toFixed(1)} km` : ''}
                        </p>
                      </div>
                      <span>{formatCalories(entry.caloriesBurned)}</span>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">
                    Aún no registras actividad hoy. Empieza con una caminata o tu entrenamiento principal.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card chart-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Balance energético</span>
              <h2>TDEE → Consumo → Ejercicio → Resultado</h2>
            </div>
            <div className="range-switch">
              {[1, 7, 30].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={selectedRange === value ? 'range-button active' : 'range-button'}
                  onClick={() => setSelectedRange(value as DateRange)}
                >
                  {value === 1 ? 'Hoy' : `Últimos ${value} días`}
                </button>
              ))}
            </div>
          </div>
          <EnergyFlowChart history={energyHistory} />
        </div>

        <div className="card weight-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Seguimiento del peso</span>
              <h2>Evolución y tendencia</h2>
            </div>
            <p className="muted-text">
              Altura: {formatHeight(profile.heightCm, profile.preferredHeightUnit)}
            </p>
          </div>

          <div className="weight-grid">
            <MetricCard
              title="Peso inicial"
              value={formatWeight(weightProgress?.initialWeightKg ?? profile.weightKg, profile.preferredWeightUnit)}
            />
            <MetricCard
              title="Peso actual"
              value={formatWeight(currentWeightKg ?? profile.weightKg, profile.preferredWeightUnit)}
            />
            <MetricCard
              title="Peso objetivo"
              value={formatWeight(plan.targetWeightKg, profile.preferredWeightUnit)}
            />
            <MetricCard
              title="Progreso"
              value={`${weightProgress?.progressPercent ?? 0}%`}
              subtitle={weightProgress?.trendLabel ?? 'Sin tendencia aún'}
            />
          </div>

          <div className="input-row">
            <label className="field compact">
              <span>Registrar peso de hoy</span>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder={profile.preferredWeightUnit === 'lb' ? '180' : '80'}
                value={weightEntryValue}
                onChange={(event) => setWeightEntryValue(event.target.value)}
              />
            </label>
            <button type="button" className="secondary-button" onClick={handleAddWeightEntry}>
              Guardar peso
            </button>
          </div>

          <div className="weight-summary">
            <p>Diferencia restante: {formatWeight(weightProgress?.remainingKg ?? 0, profile.preferredWeightUnit)}</p>
            <p>
              Promedio semanal:{' '}
              {formatWeight(
                weightProgress?.weeklyAverageKg ?? currentWeightKg ?? profile.weightKg,
                profile.preferredWeightUnit,
              )}
            </p>
          </div>

          <TrendChart
            ariaLabel="Gráfico de evolución del peso"
            data={weightTrend.map((entry) => ({
              label: entry.label,
              value: Number(formatWeight(entry.weightKg, 'kg', false)),
            }))}
            suffix=" kg"
          />
        </div>

        <div className="card history-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Historial</span>
              <h2>Calendario de adherencia</h2>
            </div>
          </div>
          <HistoryCalendar
            history={buildEnergyHistory(appState, profile, plan, 30)}
            weightUnit={profile.preferredWeightUnit}
          />
        </div>

        <div className="card future-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Preparado para crecer</span>
              <h2>Arquitectura lista para Premium</h2>
            </div>
          </div>
          <ul className="feature-list">
            <li>Persistencia local desacoplada de la UI para sumar login y base de datos después.</li>
            <li>Servicios separados para cálculos, ejercicios y estadísticas.</li>
            <li>Dashboard listo para añadir perfiles, notificaciones y suscripciones.</li>
            <li>Base adecuada para integrar Apple Health, Google Fit y wearables.</li>
          </ul>
        </div>
      </section>
    </main>
  )
}

type OnboardingFlowProps = {
  initialProfile: UserProfile | null
  onSave: (profile: UserProfile) => void
  onCancel?: () => void
}

function OnboardingFlow({ initialProfile, onSave, onCancel }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    initialProfile ? buildDraftFromProfile(initialProfile) : defaultDraft,
  )

  const profilePreview = buildProfileFromDraft(draft)
  const previewPlan = profilePreview ? calculateDailyPlan(profilePreview) : null
  const stepError = validateStep(step, draft)

  const nextStep = () => {
    if (!stepError) {
      setStep((current) => clamp(current + 1, 0, stepLabels.length - 1))
    }
  }

  const previousStep = () => setStep((current) => clamp(current - 1, 0, stepLabels.length - 1))

  const toggleWeightUnit = (unit: WeightUnit) => {
    setDraft((current) => {
      if (current.weightUnit === unit) {
        return current
      }

      return unit === 'lb'
        ? {
            ...current,
            weightUnit: unit,
            weightValue: Number(kgToLb(current.weightValue).toFixed(1)),
            targetWeightValue: Number(kgToLb(current.targetWeightValue).toFixed(1)),
          }
        : {
            ...current,
            weightUnit: unit,
            weightValue: Number(lbToKg(current.weightValue).toFixed(1)),
            targetWeightValue: Number(lbToKg(current.targetWeightValue).toFixed(1)),
          }
    })
  }

  const toggleHeightUnit = (unit: HeightUnit) => {
    setDraft((current) => {
      if (current.heightUnit === unit) {
        return current
      }

      if (unit === 'ft') {
        const converted = cmToFeetAndInches(current.heightCmValue)
        return {
          ...current,
          heightUnit: unit,
          heightFeet: converted.feet,
          heightInches: converted.inches,
        }
      }

      return {
        ...current,
        heightUnit: unit,
        heightCmValue: Number(
          feetAndInchesToCm(current.heightFeet, current.heightInches).toFixed(1),
        ),
      }
    })
  }

  const submit = () => {
    if (profilePreview) {
      onSave(profilePreview)
    }
  }

  return (
    <section className="onboarding-shell">
      <article className="card onboarding-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Onboarding</span>
            <h1>{stepLabels[step]}</h1>
          </div>
          <p className="muted-text">
            Paso {step + 1} de {stepLabels.length}
          </p>
        </div>

        <div className="step-progress">
          {stepLabels.map((label, index) => (
            <div className="step-node" key={label}>
              <div className={index <= step ? 'step-dot active' : 'step-dot'}>{index + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {step === 0 ? (
          <div className="form-grid">
            <label className="field">
              <span>Edad</span>
              <input
                type="number"
                min="15"
                max="90"
                value={draft.age}
                onChange={(event) => setDraft((current) => ({ ...current, age: Number(event.target.value) }))}
              />
            </label>
            <label className="field">
              <span>Sexo</span>
              <select
                value={draft.sex}
                onChange={(event) => setDraft((current) => ({ ...current, sex: event.target.value as Sex }))}
              >
                <option value="male">Hombre</option>
                <option value="female">Mujer</option>
              </select>
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="form-grid">
            <div className="field-group">
              <div className="unit-toggle">
                <button
                  type="button"
                  className={draft.weightUnit === 'kg' ? 'toggle-button active' : 'toggle-button'}
                  onClick={() => toggleWeightUnit('kg')}
                >
                  kg
                </button>
                <button
                  type="button"
                  className={draft.weightUnit === 'lb' ? 'toggle-button active' : 'toggle-button'}
                  onClick={() => toggleWeightUnit('lb')}
                >
                  lb
                </button>
              </div>
              <label className="field">
                <span>Peso actual</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={draft.weightValue}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, weightValue: Number(event.target.value) }))
                  }
                />
              </label>
            </div>

            <div className="field-group">
              <div className="unit-toggle">
                <button
                  type="button"
                  className={draft.heightUnit === 'cm' ? 'toggle-button active' : 'toggle-button'}
                  onClick={() => toggleHeightUnit('cm')}
                >
                  cm
                </button>
                <button
                  type="button"
                  className={draft.heightUnit === 'ft' ? 'toggle-button active' : 'toggle-button'}
                  onClick={() => toggleHeightUnit('ft')}
                >
                  ft + in
                </button>
              </div>
              {draft.heightUnit === 'cm' ? (
                <label className="field">
                  <span>Altura</span>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    value={draft.heightCmValue}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, heightCmValue: Number(event.target.value) }))
                    }
                  />
                </label>
              ) : (
                <div className="inline-grid">
                  <label className="field">
                    <span>Pies</span>
                    <input
                      type="number"
                      min="3"
                      max="8"
                      value={draft.heightFeet}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, heightFeet: Number(event.target.value) }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Pulgadas</span>
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={draft.heightInches}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, heightInches: Number(event.target.value) }))
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="choice-grid">
            {ACTIVITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={draft.activityLevel === option.value ? 'choice-card active' : 'choice-card'}
                onClick={() => setDraft((current) => ({ ...current, activityLevel: option.value }))}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="choice-grid">
            {GOAL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={draft.goal === option.value ? 'choice-card active' : 'choice-card'}
                onClick={() => setDraft((current) => ({ ...current, goal: option.value }))}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="form-grid">
            <label className="field">
              <span>Peso objetivo ({draft.weightUnit})</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={draft.targetWeightValue}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    targetWeightValue: Number(event.target.value),
                  }))
                }
              />
            </label>
            <div className="inline-hint">
              <p>
                Ajusta tu meta según el objetivo: bajar, mantener, subir o priorizar masa muscular.
              </p>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="choice-grid">
            {SPEED_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={draft.progressSpeed === option.value ? 'choice-card active' : 'choice-card'}
                onClick={() => setDraft((current) => ({ ...current, progressSpeed: option.value }))}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        ) : null}

        {step === 6 && profilePreview && previewPlan ? (
          <div className="preview-grid">
            <MetricCard title="🔥 BMR" value={formatCalories(previewPlan.bmr)} subtitle="Calorías en reposo" />
            <MetricCard title="⚡ TDEE" value={formatCalories(previewPlan.tdee)} subtitle="Gasto diario estimado" />
            <MetricCard
              title="🎯 Calorías objetivo"
              value={formatCalories(previewPlan.targetCalories)}
              subtitle="Balance neto sugerido"
            />
            <MetricCard
              title="🏃 Daily Burn Goal"
              value={formatCalories(previewPlan.recommendedExerciseBurn)}
              subtitle="Quema recomendada"
            />
            <article className="preview-plan card-surface">
              <h3>Tu objetivo diario</h3>
              <p>{previewPlan.goalSummary}</p>
              <p>
                Consumir aproximadamente {formatCalories(previewPlan.recommendedIntake)} y
                complementar con {formatCalories(previewPlan.recommendedExerciseBurn)} de
                actividad.
              </p>
              {previewPlan.warning ? <p className="warning-banner">{previewPlan.warning}</p> : null}
            </article>
          </div>
        ) : null}

        {stepError ? <p className="warning-banner">{stepError}</p> : null}

        <div className="wizard-actions">
          {onCancel ? (
            <button type="button" className="ghost-button" onClick={onCancel}>
              Cancelar
            </button>
          ) : <span />}
          <div className="wizard-actions-right">
            {step > 0 ? (
              <button type="button" className="secondary-button" onClick={previousStep}>
                Atrás
              </button>
            ) : null}
            {step < stepLabels.length - 1 ? (
              <button type="button" className="primary-button" onClick={nextStep}>
                Siguiente
              </button>
            ) : (
              <button type="button" className="primary-button" onClick={submit}>
                Guardar plan
              </button>
            )}
          </div>
        </div>
      </article>
    </section>
  )
}

function buildProfileFromDraft(draft: OnboardingDraft): UserProfile | null {
  const weightKg = draft.weightUnit === 'kg' ? draft.weightValue : lbToKg(draft.weightValue)
  const targetWeightKg =
    draft.weightUnit === 'kg' ? draft.targetWeightValue : lbToKg(draft.targetWeightValue)
  const heightCm =
    draft.heightUnit === 'cm'
      ? draft.heightCmValue
      : feetAndInchesToCm(draft.heightFeet, draft.heightInches)

  if (!Number.isFinite(weightKg) || !Number.isFinite(targetWeightKg) || !Number.isFinite(heightCm)) {
    return null
  }

  return {
    age: draft.age,
    sex: draft.sex,
    weightKg,
    heightCm,
    activityLevel: draft.activityLevel,
    goal: draft.goal,
    targetWeightKg,
    progressSpeed: draft.progressSpeed,
    preferredWeightUnit: draft.weightUnit,
    preferredHeightUnit: draft.heightUnit,
  }
}

function buildDraftFromProfile(profile: UserProfile): OnboardingDraft {
  const imperialHeight = cmToFeetAndInches(profile.heightCm)
  const weightValue =
    profile.preferredWeightUnit === 'lb'
      ? Number(kgToLb(profile.weightKg).toFixed(1))
      : Number(profile.weightKg.toFixed(1))
  const targetWeightValue =
    profile.preferredWeightUnit === 'lb'
      ? Number(kgToLb(profile.targetWeightKg).toFixed(1))
      : Number(profile.targetWeightKg.toFixed(1))

  return {
    age: profile.age,
    sex: profile.sex,
    weightUnit: profile.preferredWeightUnit,
    weightValue,
    targetWeightValue,
    heightUnit: profile.preferredHeightUnit,
    heightCmValue: Number(profile.heightCm.toFixed(1)),
    heightFeet: imperialHeight.feet,
    heightInches: imperialHeight.inches,
    activityLevel: profile.activityLevel,
    goal: profile.goal,
    progressSpeed: profile.progressSpeed,
  }
}

function validateStep(step: number, draft: OnboardingDraft) {
  if (step === 0) {
    return draft.age >= 15 && draft.age <= 90 ? '' : 'Ingresa una edad válida entre 15 y 90 años.'
  }

  if (step === 1) {
    const heightCm =
      draft.heightUnit === 'cm'
        ? draft.heightCmValue
        : feetAndInchesToCm(draft.heightFeet, draft.heightInches)
    return draft.weightValue > 0 && heightCm > 100
      ? ''
      : 'Ingresa valores válidos de peso y altura.'
  }

  if (step === 4) {
    if (draft.targetWeightValue <= 0) {
      return 'Ingresa un peso objetivo válido.'
    }

    if (draft.goal === 'lose' && draft.targetWeightValue >= draft.weightValue) {
      return 'Para perder peso, el peso objetivo debe ser menor al actual.'
    }

    if ((draft.goal === 'gain' || draft.goal === 'muscle') && draft.targetWeightValue <= draft.weightValue) {
      return 'Para subir de peso o masa muscular, el peso objetivo debe ser mayor al actual.'
    }
  }

  return ''
}

export default App
