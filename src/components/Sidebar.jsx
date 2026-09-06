export const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'alert', label: 'Admin Alert' },
  { id: 'duties', label: 'Weekly Duties' },
  { id: 'blinkit', label: 'Blinkit Orders' },
  { id: 'wakeup', label: 'Wake-up Calls' },
  { id: 'meals', label: 'Meals & Water' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'fund', label: 'Floor Fund' },
  { id: 'content', label: 'Content Drop' },
  { id: 'washer', label: 'Washing Machine' },
  { id: 'plans', label: 'Plans & Moods' },
  { id: 'spc', label: 'SPC Requests' },
  { id: 'songs', label: 'Speaker Queue' },
  { id: 'requests', label: 'Other Requests' },
  { id: 'hr', label: 'Human Resources' },
  { id: 'feedback', label: 'Feedback' },
]

export default function Sidebar({ active, onSelect }) {
  return (
    <aside id="sidebar">
      <div id="brand">
        <p className="logo">
          <span className="logo-hotel">HOTEL</span> <span className="logo-cali">CALI</span>
        </p>
        <p className="tagline">Floor 4 · shared with everyone here</p>
      </div>
      <nav>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={active === s.id ? 'active' : ''}
            onClick={() => onSelect(s.id)}
          >
            <span className="dot" />{s.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
