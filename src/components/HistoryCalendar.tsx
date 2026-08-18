import { formatCalories, formatWeight } from '../services/calorieService'
import type { EnergyHistoryEntry, WeightUnit } from '../types'

type HistoryCalendarProps = {
  history: EnergyHistoryEntry[]
  weightUnit: WeightUnit
}

export function HistoryCalendar({ history, weightUnit }: HistoryCalendarProps) {
  return (
    <div className="history-calendar">
      {history.map((entry) => (
        <article className={entry.withinGoal ? 'history-day on-target' : 'history-day off-target'} key={entry.date}>
          <header>
            <strong>{entry.label}</strong>
            <span>{entry.withinGoal ? 'Dentro del objetivo' : 'Fuera del objetivo'}</span>
          </header>
          <dl>
            <div>
              <dt>Consumo</dt>
              <dd>{formatCalories(entry.consumed)}</dd>
            </div>
            <div>
              <dt>Ejercicio</dt>
              <dd>{formatCalories(entry.exerciseBurned)}</dd>
            </div>
            <div>
              <dt>Balance</dt>
              <dd>
                {entry.totalDelta <= 0 ? '-' : '+'}
                {formatCalories(Math.abs(entry.totalDelta))}
              </dd>
            </div>
            <div>
              <dt>Peso</dt>
              <dd>{formatWeight(entry.weightKg, weightUnit)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  )
}
