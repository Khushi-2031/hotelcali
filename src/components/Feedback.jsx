import ListModule, { fmtDate } from './ListModule'
import { useMe } from '../identity'

export default function Feedback() {
  const me = useMe()
  return (
    <ListModule
      table="feedback"
      title="Feedback"
      desc="Found a bug, want a feature, or just have a review of how this is working out? Drop it here."
      fields={[
        { name: 'name', label: 'Your name (clear it to stay anonymous)', type: 'text', placeholder: 'anonymous is fine', default: me },
        { name: 'type', label: 'Type', type: 'select', options: ['Suggestion', 'Review', 'Bug report'] },
        { name: 'details', label: 'Your feedback', type: 'textarea', required: true },
      ]}
      renderCard={row => ({
        title: row.type,
        meta: `${row.name || 'Anonymous'} · ${fmtDate(row.created_at)}`,
        body: row.details,
      })}
    />
  )
}
