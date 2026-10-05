import { FLOOR } from '../data/roster'
import { SectionHead } from './ui'

const FOBS = ['pink', 'aqua']

export default function HR() {
  return (
    <div>
      <SectionHead title="Guest Register" desc="Every room on the floor, for whenever you forget who's next door." />
      <div className="register">
        {FLOOR.map((r, i) => (
          <div className="room-card" key={r.room}>
            <div className={`key-fob fob-${FOBS[i % FOBS.length]}`} aria-label={`Room ${r.room}`}>
              <span className="fob-hole" />
              <span className="fob-num">{r.room}</span>
            </div>
            <div className="room-people">
              {r.people.map(p => <div key={p}>{p}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
