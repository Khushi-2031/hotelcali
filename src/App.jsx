import { useState, useEffect } from 'react'
import Sidebar, { SECTIONS, TabBar, NeonSign } from './components/Sidebar'
import CriticalBanner from './components/CriticalBanner'
import Toast from './components/Toast'
import Dashboard from './components/Dashboard'
import Blinkit from './components/Blinkit'
import SplitTab from './components/SplitTab'
import Wakeup from './components/Wakeup'
import Meals from './components/Meals'
import Maintenance from './components/Maintenance'
import Content from './components/Content'
import Plans from './components/Plans'
import Spc from './components/Spc'
import Songs from './components/Songs'
import HR from './components/HR'
import Feedback from './components/Feedback'
import { CheckIn, CheckedInLine, NotifyButton } from './components/People'
import { initOneSignal } from './onesignal'
import { useMe } from './identity'
import AdminAlert from './components/AdminAlert'
import Calendar from './components/Calendar'
import SleepLog from './components/SleepLog'
import LobbyBell from './components/LobbyBell'

const SCREENS = {
  dashboard: Dashboard,
  alert: AdminAlert,
  blinkit: Blinkit,
  split: SplitTab,
  wakeup: Wakeup,
  meals: Meals,
  maintenance: Maintenance,
  content: Content,
  plans: Plans,
  spc: Spc,
  songs: Songs,
  hr: HR,
  feedback: Feedback,
  calendar: Calendar,
  sleep: SleepLog,
}

export default function App() {
  const initial = SECTIONS.some(s => s.id === location.hash.replace('#', '')) ? location.hash.replace('#', '') : 'dashboard'
  const [active, setActive] = useState(initial)
  const [bannerKey, setBannerKey] = useState(0)
  const me = useMe()

  useEffect(() => { initOneSignal() }, [])

  function select(id) {
    setActive(id)
    location.hash = id
    window.scrollTo(0, 0)
  }

  if (!me) return <CheckIn />

  const Screen = SCREENS[active]
  const section = SECTIONS.find(s => s.id === active)

  return (
    <div id="app" className={`tone-${section?.tone || 'pink'}`}>
      <Sidebar active={active} onSelect={select} />
      <div id="main">
        <div className="awning" aria-hidden="true" />
        <CriticalBanner refreshKey={bannerKey} />
        {active === 'dashboard' && (
          <div className="hero-sign">
            <NeonSign />
          </div>
        )}
        <div id="content">
          <CheckedInLine />
          <Screen onChange={() => setBannerKey(k => k + 1)} go={select} />
          <div className="notify-btn"><NotifyButton label="Enable notifications on this device" /></div>
        </div>
      </div>
      <TabBar active={active} onSelect={select} />
      <Toast />
      <LobbyBell />
    </div>
  )
}
