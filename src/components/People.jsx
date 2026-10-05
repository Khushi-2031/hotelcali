import { useState } from 'react'
import { ALL_PEOPLE, FLOOR } from '../data/roster'
import { firstName, setMe, useMe, useRoom, roomOf } from '../identity'
import { linkDeviceTo, enableNotifications, notificationState } from '../onesignal'
import { NeonSign } from './Sidebar'
import { bellOn, setBell, ringBell } from './LobbyBell'
import { useSchedule, setMySubjects } from '../schedule'

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

/** Button that turns notifications on and says exactly what happened. */
export function NotifyButton({ className = 'btn ghost small', label = 'Turn on notifications', onDone }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(notificationState() === 'granted' ? { ok: true, message: 'Notifications are on for this phone.' } : null)

  async function go() {
    setBusy(true)
    const r = await enableNotifications()
    setResult(r)
    setBusy(false)
    if (r.ok && onDone) onDone()
  }

  return (
    <div className="notify-wrap">
      <button type="button" className={className} onClick={go} disabled={busy}>
        {busy ? 'Asking your phone…' : result?.ok ? 'Notifications are on' : label}
      </button>
      {result && <p className={`notify-msg ${result.ok ? 'ok' : 'warn'}`} role="status">{result.message}</p>}
    </div>
  )
}

/**
 * First-time check-in. Shown full screen until this phone has a name.
 * Name + room are remembered on the phone for every visit after.
 */
export function CheckIn() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [subs, setSubs] = useState([])
  const schedule = useSchedule()
  const allSubjects = schedule?.subjects || []
  const rooms = FLOOR.map(r => r.room)

  function pickName(n) {
    setName(n)
    setRoom(roomOf(n))
  }

  function checkIn(e) {
    e.preventDefault()
    if (!name || !room) return
    setStep(2)
  }

  function finish() {
    if (subs.length) setMySubjects(subs)
    setMe(name, room)
    linkDeviceTo(name)
  }

  return (
    <div className="checkin">
      <div className="awning" aria-hidden="true" />
      <div className="checkin-body">
        <NeonSign />
        {step === 1 ? (
          <form className="checkin-card" onSubmit={checkIn}>
            <h1>Welcome. Please check in.</h1>
            <p className="form-hint">Do this once. The app remembers you on this phone after that.</p>
            <label htmlFor="ci-name">Your name</label>
            <select id="ci-name" value={name} onChange={e => pickName(e.target.value)} required>
              <option value="">Choose your name</option>
              {FLOOR.map(r => (
                <optgroup key={r.room} label={`Room ${r.room}`}>
                  {r.people.map(p => <option key={p} value={p}>{p}</option>)}
                </optgroup>
              ))}
            </select>
            <label htmlFor="ci-room">Room number</label>
            <select id="ci-room" value={room} onChange={e => setRoom(e.target.value)} required>
              <option value="">Choose your room</option>
              {rooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {allSubjects.length > 0 && (
              <>
                <label>Your subjects this term</label>
                <div className="np-chips">
                  {allSubjects.map(x => (
                    <button key={x} type="button" className={`np-chip ${subs.includes(x) ? 'on' : ''}`} aria-pressed={subs.includes(x)}
                      onClick={() => setSubs(v => v.includes(x) ? v.filter(y => y !== x) : [...v, x])}>{x}</button>
                  ))}
                </div>
              </>
            )}
            <button className="btn checkin-btn" type="submit" disabled={!name || !room}>Check in</button>
          </form>
        ) : (
          <div className="checkin-card">
            <h1>Hi {firstName(name)}, you're in room {room}.</h1>
            <p className="form-hint">Turn on notifications so wake-up calls, Blinkit runs and front desk requests reach you.</p>
            <NotifyButton className="btn checkin-btn" label="Turn on notifications" onDone={finish} />
            <button type="button" className="link-btn checkin-skip" onClick={finish}>Continue to the app</button>
            <button type="button" className="link-btn danger" onClick={() => setStep(1)}>Back, wrong name</button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Small "checked in as" line with a way to switch person. */
export function CheckedInLine() {
  const me = useMe()
  const room = useRoom()
  const [bell, setBellState] = useState(bellOn())
  if (!me) return null
  function toggleBell() {
    const next = !bell
    setBell(next); setBellState(next)
    if (next) ringBell()
  }
  return (
    <div className="whoami-line">
      <span>Checked in as <strong>{firstName(me)}</strong> · Room {room}</span>
      <button type="button" className="link-btn" onClick={toggleBell} aria-pressed={bell}>Bell {bell ? 'on' : 'off'}</button>
      <button type="button" className="link-btn" onClick={() => { if (confirm('Check out and check in as someone else?')) setMe(null) }}>Not you?</button>
    </div>
  )
}

/** "Posting as" line for forms, replacing the old name dropdown. */
export function PostingAs() {
  const me = useMe()
  const room = useRoom()
  if (!me) return null
  return <p className="posting-as">Posting as <strong>{me}</strong> · Room {room}</p>
}
