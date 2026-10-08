import { useState } from 'react'
import { useMe, isGuest, isAdmin, GUEST_HIDDEN } from '../identity'

// `label` is the motel name shown in the UI, `sub` is the plain-English name
// so nobody has to decode the theme to find a feature.
export const SECTIONS = [
  { id: 'dashboard', label: 'Front Desk', short: 'Home', sub: 'Dashboard and requests', tone: 'pink' },
  { id: 'calendar', label: 'Calendar', short: 'Classes', sub: 'Classes and academic dates', tone: 'aqua' },
  { id: 'meals', label: 'Meal Plans', short: 'Mess', sub: 'Mess hours, water, chhota runs', tone: 'aqua' },
  { id: 'sleep', label: 'Sleep Log', short: 'Sleep', sub: 'When you slept', tone: 'mint' },
  { id: 'wakeup', label: 'Wake-up Calls', short: 'Wake-up', sub: 'Get knocked on time', tone: 'pink' },
  { id: 'plans', label: 'Plans & Moods', short: 'Plans', sub: "Tonight's board", tone: 'violet' },
  { id: 'songs', label: 'Jukebox', short: 'Jukebox', sub: 'Speaker queue', tone: 'aqua' },
  { id: 'content', label: 'Postcards', short: 'Postcards', sub: 'Photos and videos', tone: 'pink' },
  { id: 'hr', label: 'Guest Register', short: 'Guests', sub: "Who's in which room", tone: 'aqua' },
  { id: 'split', label: 'Settle Up', short: 'Settle Up', sub: 'Split expenses', tone: 'mint' },
  { id: 'blinkit', label: 'Room Service', short: 'Blinkit', sub: 'Blinkit runs and orders', tone: 'sun' },
  { id: 'maintenance', label: 'Repairs', short: 'Repairs', sub: 'Maintenance tickets', tone: 'sun' },
  { id: 'spc', label: 'SPC Desk', short: 'SPC', sub: 'From and to the SPC reps', tone: 'sun' },
  { id: 'feedback', label: 'Feedback', short: 'Feedback', sub: 'Tell us about the app', tone: 'violet' },
  { id: 'alert', label: 'Admin Alert', short: 'Alert', sub: 'Ping the whole floor', tone: 'red' },
  { id: 'activity', label: 'Activity Log', short: 'Activity', sub: 'Who used what (only you)', tone: 'violet', admin: true },
]

// Features grouped the same way on the home shelves, the tab bar and the desktop sidebar.
export const GROUPS = [
  { id: 'daily', label: 'Daily', items: ['calendar', 'meals', 'sleep', 'wakeup'] },
  { id: 'floor', label: 'Floor life', items: ['plans', 'songs', 'content', 'hr'] },
  { id: 'money', label: 'Money', items: ['split', 'blinkit'] },
  { id: 'backend', label: 'Backend', items: ['maintenance', 'spc', 'feedback', 'alert', 'activity'] },
]

// What this person is allowed to see in the menus.
export function visibleSections(me) {
  return SECTIONS.filter(s => !(s.admin && !isAdmin(me)) && !(isGuest(me) && GUEST_HIDDEN.includes(s.id)))
}

export const sectionById = (id) => SECTIONS.find(s => s.id === id) || SECTIONS[0]

// Groups with only the sections this person can open; empty groups dropped.
export function visibleGroups(me) {
  const ok = new Set(visibleSections(me).map(s => s.id))
  return GROUPS.map(g => ({ ...g, sections: g.items.filter(id => ok.has(id)).map(sectionById) })).filter(g => g.sections.length)
}
export const groupOf = (id) => GROUPS.find(g => g.items.includes(id))

const ICONS = {
  dashboard: <><path d="M5 17a7 7 0 0 1 14 0" /><path d="M12 10V7M10 7h4M3 17h18M4 20h16" /></>,
  daily: <><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M9 3v4M15 3v4" /><path d="M8.5 14h3M8.5 17h6" /></>,
  floor: <><path d="M4 11l8-6 8 6" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></>,
  money: <><circle cx="12" cy="12" r="9" /><path d="M9 7.5h6M9 11h6M11 7.5c3.5 0 3.5 7 0 7h-2l5 3.5" /></>,
  backend: <><path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.3 2.3-2.4-.6-.6-2.4z" /></>,
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
      <span className="neon-script">Hotel Cali</span>
      <span className="neon-sub">Ashoka 4th · MICA</span>
    </p>
  )
}

function NavItem({ s, active, onSelect }) {
  return (
    <button
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
  )
}

// Desktop: Front Desk, then every section under its group.
export default function Sidebar({ active, onSelect }) {
  const me = useMe()
  return (
    <aside id="sidebar">
      <div id="brand"><NeonSign small /></div>
      <nav aria-label="Sections">
        <NavItem s={sectionById('dashboard')} active={active} onSelect={onSelect} />
        {visibleGroups(me).map(g => (
          <div className="nav-group" key={g.id}>
            <div className="nav-group-label">{g.label}</div>
            {g.sections.map(s => <NavItem key={s.id} s={s} active={active} onSelect={onSelect} />)}
          </div>
        ))}
      </nav>
    </aside>
  )
}

// Feature tiles for one group, used in the home shelves and the tab bar sheet.
export function GroupTiles({ group, active, onSelect, live = {} }) {
  return (
    <div className="directory">
      {group.sections.map(s => (
        <button key={s.id} className={`dir-tile tone-${s.tone} ${active === s.id ? 'active' : ''}`} onClick={() => onSelect(s.id)}>
          <span className="dir-dot" />
          <span className="dir-label">{s.short}</span>
          <span className="dir-sub">{live[s.id] || s.sub}</span>
        </button>
      ))}
    </div>
  )
}

// Mobile, on every page except Home: Home plus the four groups. A group opens its features.
export function TabBar({ active, onSelect }) {
  const me = useMe()
  const [open, setOpen] = useState(null)
  const groups = visibleGroups(me)
  const sheet = groups.find(g => g.id === open)
  const current = groupOf(active)?.id

  function go(id) {
    setOpen(null)
    onSelect(id)
  }

  if (active === 'dashboard') return null

  return (
    <>
      {sheet && (
        <div className="sheet-backdrop" onClick={() => setOpen(null)}>
          <div className="sheet" role="dialog" aria-label={sheet.label} onClick={e => e.stopPropagation()}>
            <div className="sheet-head">
              <h2>{sheet.label}</h2>
              <button className="btn ghost small" onClick={() => setOpen(null)}>Close</button>
            </div>
            <GroupTiles group={sheet} active={active} onSelect={go} />
          </div>
        </div>
      )}
      <nav id="tabbar" aria-label="Main">
        <button onClick={() => go('dashboard')}>
          <Icon name="dashboard" />
          <span>Home</span>
        </button>
        {groups.map(g => (
          <button key={g.id} className={current === g.id || open === g.id ? 'active' : ''} aria-expanded={open === g.id}
            onClick={() => (g.sections.length === 1 ? go(g.sections[0].id) : setOpen(o => (o === g.id ? null : g.id)))}>
            <Icon name={g.id} />
            <span>{g.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
