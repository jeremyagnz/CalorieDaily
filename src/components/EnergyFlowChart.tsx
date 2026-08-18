import { formatCalories } from '../services/calorieService'
import type { EnergyHistoryEntry } from '../types'

type EnergyFlowChartProps = {
  history: EnergyHistoryEntry[]
}

export function EnergyFlowChart({ history }: EnergyFlowChartProps) {
  if (!history.length) {
    return null
  }

  const latest = history[history.length - 1]
  const maxValue = Math.max(
    ...history.flatMap((entry) => [entry.tdee, entry.consumed, entry.exerciseBurned, Math.abs(entry.totalDelta)]),
    1,
  )

  return (
    <div className="energy-chart">
      <div className="energy-columns">
        {[
          { label: 'TDEE', value: latest.tdee },
          { label: 'Consumo', value: latest.consumed },
          { label: 'Ejercicio', value: latest.exerciseBurned },
          { label: latest.totalDelta <= 0 ? 'Déficit' : 'Superávit', value: Math.abs(latest.totalDelta) },
        ].map((column) => (
          <div className="energy-column" key={column.label}>
            <span>{column.label}</span>
            <strong>{formatCalories(column.value)}</strong>
            <div className="energy-bar">
              <div
                className="energy-bar-fill"
                style={{ height: `${Math.max(8, (column.value / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="energy-history">
        {history.map((entry) => {
          const height = Math.max(8, (Math.abs(entry.totalDelta) / maxValue) * 100)
          return (
            <div className="energy-history-item" key={entry.date}>
              <div
                className={entry.totalDelta <= 0 ? 'history-bar deficit' : 'history-bar surplus'}
                style={{ height: `${height}%` }}
                title={`${entry.label}: ${formatCalories(Math.abs(entry.totalDelta))}`}
              />
              <span>{entry.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
