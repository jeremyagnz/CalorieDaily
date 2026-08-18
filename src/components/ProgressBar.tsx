type ProgressBarProps = {
  label: string
  value: number
}

export function ProgressBar({ label, value }: ProgressBarProps) {
  const boundedValue = Math.max(0, Math.min(100, value))

  return (
    <div className="progress-card" aria-label={label}>
      <div className="progress-header">
        <span>{label}</span>
        <strong>{boundedValue}%</strong>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${boundedValue}%` }} />
      </div>
    </div>
  )
}
