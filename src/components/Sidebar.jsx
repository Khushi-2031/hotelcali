import { useState } from 'react'

// `label` is the motel name shown in the UI, `sub` is the plain-English name
// so nobody has to decode the theme to find a feature.
export const SECTIONS = [
  { id: 'dashboard', label: 'Front Desk', sub: 'Dashboard and requests', tone: 'pink' },
  { id: 'hr', label: 'Guest Register', sub: "Who's in which room", tone: 'aqua' },
  { id: 'plans', label: 'Plans & Moods', sub: "Tonight's board", tone: 'violet' },
  { id: 'blinkit', label: 'Room Service', sub: 'Blinkit orders', tone: 'sun' },
  { id: 'split', label: 'Settle Up', sub: 'Split expenses', tone: 'mint' },
  { id: 'meals', label: 'Mess & Water', sub: 'Meals, water, chhota runs', tone: 'aqua' },
  { id: 'wakeup', label: 'Wake-up Calls', sub: 'Get knocked on time', tone: 'pink' },
  { id: 'maintenance', label: 'Repairs', sub: 'Maintenance tickets', tone: 'sun' },
  { id: 'songs', label: 'Jukebox', sub: 'Speaker queue', tone: 'aqua' },
  { id: 'content', label: 'Postcards', sub: 'Photos and videos', tone: 'pink' },
  { id: 'spc', label: 'SPC Desk', sub: 'From and to the SPC reps', tone: 'sun' },
  { id: 'feedback', label: 'Feedback', sub: 'Tell us about the app', tone: 'violet' },
  { id: 'alert', label: 'Admin Alert', sub: 'Ping the whole floor', tone: 'red' },
]

export const sectionById = (id) => SECTIONS.find(s => s.id === id) || SECTIONS[0]

const TABS = ['dashboard', 'hr', 'plans', 'blinkit']

const ICONS = {
  dashboard: <><path d="M5 17a7 7 0 0 1 14 0" /><path d="M12 10V7M10 7h4M3 17h18M4 20h16" /></>,
  hr: <><circle cx="8" cy="16" r="4" /><path d="M11 13l9-9M16 8l2.5 2.5M13.5 10.5l2 2" /></>,
  plans: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 17v4M17 19h4" /></>,
  blinkit: <><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  more: <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>,
}

function Icon({ name }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}

export function NeonSign({ small }) {
  return (
    <p className={`neon-sign ${small ? 'small' : ''}`}>
      <span className="neon-script"><span className="neon-red">Hotel</span> <span className="neon-blue">Cali</span></span>
      <span className="neon-sub">Ashoka 4th · MICA</span>
    </p>
  )
}

// Desktop: a full sidebar listing every section.
export default function Sidebar({ active, onSelect }) {
  return (
    <aside id="sidebar">
      <div id="brand"><NeonSign small /></div>
      <nav aria-label="Sections">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`nav-item tone-${s.tone} ${active === s.id ? 'active' : ''}`}
            aria-current={active === s.id ? 'page' : undefined}
            onClick={() => onSelect(s.id)}
          >
            <span className="dot" />
            <span className="nav-text">
              <span className="nav-label">{s.label}</span>
              <span className="nav-sub">{s.sub}</span>
            </span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

// Mobile: four main tabs plus a "More" sheet with the full directory.
export function TabBar({ active, onSelect }) {
  const [open, setOpen] = useState(false)
  const inMore = !TABS.includes(active)

  function go(id) {
    setOpen(false)
    onSelect(id)
  }

  return (
    <>
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-label="Directory" onClick={e => e.stopPropagation()}>
            <div className="sheet-head">
              <h2>Directory</h2>
              <button className="btn ghost small" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="directory">
              {SECTIONS.filter(s => !TABS.includes(s.id)).map(s => (
                <button key={s.id} className={`dir-tile tone-${s.tone} ${active === s.id ? 'active' : ''}`} onClick={() => go(s.id)}>
                  <span className="dir-dot" />
                  <span className="dir-label">{s.label}</span>
                  <span className="dir-sub">{s.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav id="tabbar" aria-label="Main">
        {TABS.map(id => {
          const s = sectionById(id)
          return (
            <button key={id} className={active === id ? 'active' : ''} aria-current={active === id ? 'page' : undefined} onClick={() => go(id)}>
              <Icon name={id} />
              <span>{id === 'blinkit' ? 'Blinkit' : id === 'hr' ? 'Guests' : id === 'plans' ? 'Plans' : s.label}</span>
            </button>
          )
        })}
        <button className={inMore || open ? 'active' : ''} aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <Icon name="more" />
          <span>More</span>
        </button>
      </nav>
    </>
  )
}
