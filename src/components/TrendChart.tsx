type TrendChartProps = {
  ariaLabel: string
  data: Array<{ label: string; value: number }>
  suffix?: string
}

export function TrendChart({ ariaLabel, data, suffix = '' }: TrendChartProps) {
  if (!data.length) {
    return null
  }

  const min = Math.min(...data.map((entry) => entry.value))
  const max = Math.max(...data.map((entry) => entry.value))
  const width = 100
  const height = 36
  const points = data
    .map((entry, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * width
      const y = height - ((entry.value - min) / Math.max(max - min, 1)) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        <polyline points={points} />
      </svg>
      <div className="trend-axis">
        <span>
          {data[0]?.value.toFixed(1)}
          {suffix}
        </span>
        <span>
          {data[data.length - 1]?.value.toFixed(1)}
          {suffix}
        </span>
      </div>
    </div>
  )
}
