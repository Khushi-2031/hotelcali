import { useState, useEffect } from 'react'
import Sidebar, { SECTIONS, TabBar, NeonSign } from './components/Sidebar'
import CriticalBanner from './components/CriticalBanner'
import Toast from './components/Toast'
import Dashboard from './components/Dashboard'
import Duties from './components/Duties'
import Blinkit from './components/Blinkit'
import Wakeup from './components/Wakeup'
import Meals from './components/Meals'
import Maintenance from './components/Maintenance'
import FloorFund from './components/FloorFund'
import Content from './components/Content'
import Washer from './components/Washer'
import Plans from './components/Plans'
import Spc from './components/Spc'
import Songs from './components/Songs'
import Requests from './components/Requests'
import HR from './components/HR'
import Feedback from './components/Feedback'
import { initOneSignal, askForPushPermission } from './onesignal'
import AdminAlert from './components/AdminAlert'

const SCREENS = {
  dashboard: Dashboard,
  alert: AdminAlert,
  duties: Duties,
  blinkit: Blinkit,
  wakeup: Wakeup,
  meals: Meals,
  maintenance: Maintenance,
  fund: FloorFund,
  content: Content,
  washer: Washer,
  plans: Plans,
  spc: Spc,
  songs: Songs,
  requests: Requests,
  hr: HR,
  feedback: Feedback,
}

export default function App() {
  const initial = SECTIONS.some(s => s.id === location.hash.replace('#', '')) ? location.hash.replace('#', '') : 'dashboard'
  const [active, setActive] = useState(initial)
  const [bannerKey, setBannerKey] = useState(0)

  useEffect(() => { initOneSignal() }, [])

  function select(id) {
    setActive(id)
    location.hash = id
    window.scrollTo(0, 0)
  }

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
          <Screen onChange={() => setBannerKey(k => k + 1)} />
          <button className="btn ghost small notify-btn" onClick={askForPushPermission}>Enable notifications on this device</button>
        </div>
      </div>
      <TabBar active={active} onSelect={select} />
      <Toast />
    </div>
  )
}
