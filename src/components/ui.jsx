export function Card({ children, critical }) {
  return <div className={`card ${critical ? 'critical' : ''}`}>{children}</div>
}

export function Pill({ tone = 'red', children }) {
  return <span className={`pill ${tone}`}>{children}</span>
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>
}

export function SectionHead({ title, desc }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      <p>{desc}</p>
    </div>
  )
}

export function fmtDate(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
