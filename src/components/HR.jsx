import { FLOOR } from '../data/roster'
import { SectionHead } from './ui'

export default function HR() {
  return (
    <div>
      <SectionHead title="Human Resources" desc="Every room on the floor, for whenever you forget who's next door." />
      <table>
        <thead><tr><th>Room</th><th>Residents</th></tr></thead>
        <tbody>
          {FLOOR.map(r => (
            <tr key={r.room}><td>{r.room}</td><td>{r.people.join(', ')}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
