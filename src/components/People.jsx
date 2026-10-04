import { useState } from 'react'
import { ALL_PEOPLE } from '../data/roster'
import { firstName, setMe, useMe } from '../identity'
import { linkDeviceTo, askForPushPermission } from '../onesignal'

/**
 * Pick who gets pinged. Value is an array of full names, or ['ALL'].
 */
export function NotifyPicker({ value, onChange, label = 'Ping', allowAll = true, exclude = [] }) {
  const isAll = value.includes('ALL')
  const people = ALL_PEOPLE.filter(p => !exclude.includes(p))

  function toggle(name) {
    if (name === 'ALL') return onChange(isAll ? [] : ['ALL'])
    const base = value.filter(v => v !== 'ALL')
    onChange(base.includes(name) ? base.filter(v => v !== name) : [...base, name])
  }

  return (
    <div className="notify-picker">
      <div className="np-head">
        <label>{label}</label>
        <span className="np-count">{isAll ? 'Everyone' : value.length ? `${value.length} selected` : 'Nobody yet'}</span>
      </div>
      <div className="np-chips">
        {allowAll && (
          <button type="button" className={`np-chip np-all ${isAll ? 'on' : ''}`} aria-pressed={isAll} onClick={() => toggle('ALL')}>Everyone</button>
        )}
        {people.map(p => {
          const on = !isAll && value.includes(p)
          return (
            <button type="button" key={p} className={`np-chip ${on ? 'on' : ''}`} aria-pressed={on} disabled={isAll} onClick={() => toggle(p)}>
              {firstName(p)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Each phone remembers who is using it, so pings can reach the right person.
 */
export function WhoAmI() {
  const me = useMe()
  const [editing, setEditing] = useState(false)
  const [pick, setPick] = useState(me || '')

  function save(name) {
    if (!name) return
    setMe(name)
    linkDeviceTo(name)
    setEditing(false)
  }

  if (!me || editing) {
    return (
      <div className="whoami card">
        <div className="card-title">Who's checking in?</div>
        <div className="card-meta">Pick your name once on this phone so pings meant for you reach you.</div>
        <div className="whoami-row">
          <select value={pick} onChange={e => setPick(e.target.value)} aria-label="Your name">
            <option value="">Choose your name</option>
            {ALL_PEOPLE.map(p => <option key={p}>{p}</option>)}
          </select>
          <button className="btn small" type="button" disabled={!pick} onClick={() => { save(pick); askForPushPermission() }}>Check in</button>
        </div>
      </div>
    )
  }

  return (
    <div className="whoami-line">
      <span>Checked in as <strong>{me}</strong></span>
      <button type="button" className="link-btn" onClick={() => { setPick(me); setEditing(true) }}>Not you?</button>
    </div>
  )
}
