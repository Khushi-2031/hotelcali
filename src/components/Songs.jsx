import ListModule, { fmtDate } from './ListModule'

export default function Songs() {
  return (
    <ListModule
      table="song_queue"
      title="Jukebox"
      desc="Recommend what should play on the floor speaker next."
      fields={[
        { name: 'name', type: 'me' },
        { name: 'song', label: 'Song & artist', type: 'text', placeholder: 'e.g. Kesariya, Arijit Singh', required: true },
      ]}
      renderCard={row => ({
        title: row.song,
        meta: `suggested by ${row.name} · ${fmtDate(row.created_at)}`,
      })}
    />
  )
}
