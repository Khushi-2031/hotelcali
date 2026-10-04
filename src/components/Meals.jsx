import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { SectionHead } from './ui'
import { pushToast } from './Toast'
import MealClock from './MealClock'

export default function Meals() {
  const [count, setCount] = useState(0)

  async function refreshCount() {
    const today = new Date().toISOString().slice(0, 10)
    const { count: c } = await supabase
      .from('water_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('day', today)
    setCount(c || 0)
  }

  useEffect(() => { refreshCount() }, [])

  async function logWater() {
    const { error } = await supabase.from('water_checkins').insert({ day: new Date().toISOString().slice(0, 10) })
    if (!error) { pushToast('Logged — stay hydrated'); refreshCount() }
  }

  return (
    <div>
      <SectionHead title="Mess & Water" desc="Fixed windows for the mess, plus a running floor water tally — no one has to remember to drink water alone." />
      <div className="card">
        <MealClock />
        <div style={{ marginTop: 16 }}>
          <button className="btn ghost small" onClick={logWater}>I drank a glass of water</button>
          <span className="card-meta" style={{ marginLeft: 10 }}>{count} glasses logged by the floor today</span>
        </div>
      </div>
    </div>
  )
}
