import { useEffect, useState } from 'react'
import { ALL_PEOPLE, FLOOR } from '../data/roster'
import { firstName, setMe, useMe, useRoom, roomOf, GUEST, GUEST_PASSWORD, isGuest } from '../identity'
import { linkDeviceTo, enableNotifications, notificationState } from '../onesignal'
import { hasPin, setPin, checkPin } from '../api'
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
 * PIN step: set a PIN the first time, enter it after that.
 * Used inside check-in, and on its own for phones that checked in
 * before PINs existed.
 */
export function PinStep({ name, onVerified, onBack, backLabel = 'Back, wrong name' }) {
  const [mode, setMode] = useState('loading') // loading | set | enter | off
  const [pin, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    hasPin(name).then(r => {
      if (!alive) return
      if (!r.ok) setMode(r.missing ? 'off' : 'enter')
      else setMode(r.data ? 'enter' : 'set')
    })
    return () => { alive = false }
  }, [name])

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (mode === 'off') return onVerified(remember)
    if (!/^[0-9]{4}$/.test(pin)) return setErr('Your PIN is 4 digits.')
    setBusy(true)
    if (mode === 'set') {
      if (pin !== pin2) { setBusy(false); return setErr("The two PINs don't match.") }
      const r = await setPin(name, pin)
      setBusy(false)
      if (r.ok && r.data) return onVerified(remember)
      if (r.ok && !r.data) { setMode('enter'); setPin1(''); setPin2(''); return setErr('Someone already set a PIN for this name. Enter it, or ask Khushi to reset it.') }
      if (r.missing) return onVerified(remember)
      return setErr("Couldn't save your PIN. Check your internet and try again.")
    }
    const r = await checkPin(name, pin)
    setBusy(false)
    if (r.ok && r.data) return onVerified(remember)
    if (r.missing) return onVerified(remember)
    if (r.ok) { setPin1(''); return setErr("That PIN doesn't match. Forgot it? Ask Khushi to reset it.") }
    setErr("Couldn't check your PIN. Check your internet and try again.")
  }

  const pinInput = (value, set, label, id) => (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} className="pin-input" type="password" inputMode="numeric" autoComplete={mode === 'set' ? 'new-password' : 'current-password'}
        pattern="[0-9]*" maxLength={4} value={value} onChange={e => set(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" required />
    </>
  )

  return (
    <form className="checkin-card" onSubmit={submit}>
      <h1>{mode === 'set' ? `Set your PIN, ${firstName(name)}` : mode === 'enter' ? `Welcome back, ${firstName(name)}` : `Hi ${firstName(name)}`}</h1>
      <p className="form-hint">
        {mode === 'set' && 'Choose a 4-digit PIN. You will need it to check in as yourself on any phone, so nobody else can post as you.'}
        {mode === 'enter' && 'Enter your 4-digit PIN to check in.'}
        {mode === 'loading' && 'One sec…'}
        {mode === 'off' && 'PINs are not switched on yet, so you can go straight in.'}
      </p>
      {(mode === 'set' || mode === 'enter') && pinInput(pin, setPin1, mode === 'set' ? 'New PIN' : 'PIN', 'pin-1')}
      {mode === 'set' && pinInput(pin2, setPin2, 'Type it again', 'pin-2')}
      <label className="remember">
        <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
        <span>Keep me checked in on this phone. You stay in until you tap Check out.</span>
      </label>
      {err && <div className="form-error" role="alert">{err}</div>}
      <button className="btn checkin-btn" type="submit" disabled={busy || mode === 'loading'}>{busy ? 'Checking…' : mode === 'set' ? 'Save PIN and check in' : 'Check in'}</button>
      {onBack && <button type="button" className="link-btn danger checkin-skip" onClick={onBack}>{backLabel}</button>}
    </form>
  )
}

/**
 * First-time check-in: name and room, then PIN, then notifications.
 */
export function CheckIn() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [subs, setSubs] = useState([])
  const [remember, setRemember] = useState(true)
  const schedule = useSchedule()
  const allSubjects = schedule?.subjects || []
  const rooms = FLOOR.map(r => r.room)

  function pickName(n) {
    setName(n)
    setRoom(roomOf(n))
  }

  function next(e) {
    e.preventDefault()
    if (!name || !room) return
    setStep(2)
  }

  function finish() {
    if (subs.length) setMySubjects(subs)
    setMe(name, room, remember)
    linkDeviceTo(name)
  }

  return (
    <div className="checkin">
      <div className="awning" aria-hidden="true" />
      <div className="checkin-body">
        <NeonSign />
        {step === 1 && (
          <form className="checkin-card" onSubmit={next}>
            <h1>Welcome. Please check in.</h1>
            <p className="form-hint">Pick your name and room. Next you'll set a PIN.</p>
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
            <button className="btn checkin-btn" type="submit" disabled={!name || !room}>Next</button>
          </form>
        )}
        {step === 1 && <GuestCheckIn />}
        {step === 2 && (
          <PinStep name={name} onVerified={(r) => { setRemember(r); setStep(3) }} onBack={() => setStep(1)} />
        )}
        {step === 3 && (
          <div className="checkin-card">
            <h1>You're in, {firstName(name)}. Room {room}.</h1>
            <p className="form-hint">Turn on notifications so wake-up calls, Blinkit runs and front desk requests reach you.</p>
            <NotifyButton className="btn checkin-btn" label="Turn on notifications" onDone={finish} />
            <button type="button" className="link-btn checkin-skip" onClick={finish}>Continue to the app</button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Visitors: one shared guest login, password printed right here. View only. */
function GuestCheckIn() {
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  function go(e) {
    e.preventDefault()
    if (pw.trim().toLowerCase() !== GUEST_PASSWORD) return setErr('That is not the guest password. It is written just above.')
    setMe(GUEST, '', false)
  }

  if (!open) {
    return <button type="button" className="link-btn guest-link" onClick={() => setOpen(true)}>Just visiting? Check in as a guest</button>
  }
  return (
    <form className="checkin-card guest-card" onSubmit={go}>
      <h1>Guest check-in</h1>
      <p className="form-hint">For friends visiting the floor. Guests can look around but can't post, ping anyone or see Settle Up, the Sleep Log or the SPC Desk.</p>
      <div className="guest-pw">Guest password: <strong>{GUEST_PASSWORD}</strong></div>
      <label htmlFor="guest-pw">Type the password</label>
      <input id="guest-pw" value={pw} onChange={e => setPw(e.target.value)} autoCapitalize="none" autoComplete="off" placeholder="ashoka4th" required />
      {err && <div className="form-error" role="alert">{err}</div>}
      <button className="btn checkin-btn" type="submit">Enter as guest</button>
      <button type="button" className="link-btn checkin-skip" onClick={() => setOpen(false)}>Back</button>
    </form>
  )
}

/** For phones checked in before PINs existed: set or enter the PIN once. */
export function PinGate() {
  const me = useMe()
  const room = useRoom()
  return (
    <div className="checkin">
      <div className="awning" aria-hidden="true" />
      <div className="checkin-body">
        <NeonSign />
        <PinStep name={me} onVerified={(remember) => setMe(me, room, remember)}
          onBack={() => setMe(null)} backLabel={`Not ${firstName(me)}? Check out`} />
      </div>
    </div>
  )
}

/** Small "checked in as" line with bell, refresh and check out. */
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
      {isGuest(me)
        ? <span className="guest-badge">Guest · view only</span>
        : <span>Checked in as <strong>{firstName(me)}</strong> · Room {room}</span>}
      <button type="button" className="link-btn" onClick={() => window.location.reload()} aria-label="Refresh the app">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }}><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>Refresh
      </button>
      <button type="button" className="link-btn" onClick={toggleBell} aria-pressed={bell}>Bell {bell ? 'on' : 'off'}</button>
      <button type="button" className="link-btn" onClick={() => { if (confirm('Check out of Hotel Cali on this phone? You will need your PIN to check back in.')) setMe(null) }}>Check out</button>
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
