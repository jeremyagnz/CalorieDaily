type MetricCardProps = {
  title: string
  value: string
  subtitle?: string
  tone?: 'default' | 'accent'
}

export function MetricCard({ title, value, subtitle, tone = 'default' }: MetricCardProps) {
  return (
    <article className={`metric-card ${tone}`}>
      <p>{title}</p>
      <strong>{value}</strong>
      {subtitle ? <span>{subtitle}</span> : null}
    </article>
  )
}
