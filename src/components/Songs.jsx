import ListModule, { fmtDate } from './ListModule'
import { ALL_PEOPLE } from '../data/roster'

export default function Songs() {
  return (
    <ListModule
      table="song_queue"
      title="Speaker queue"
      desc="Recommend what should play on the floor speaker next."
      fields={[
        { name: 'name', label: 'Your name', type: 'select', options: ALL_PEOPLE },
        { name: 'song', label: 'Song & artist', type: 'text', placeholder: 'e.g. Kesariya — Arijit Singh', required: true },
      ]}
      renderCard={row => ({
        title: row.song,
        meta: `suggested by ${row.name} · ${fmtDate(row.created_at)}`,
      })}
    />
  )
}
