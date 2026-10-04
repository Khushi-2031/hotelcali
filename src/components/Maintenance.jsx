import ListModule, { fmtDate, Pill } from './ListModule'
import { ALL_PEOPLE } from '../data/roster'

export default function Maintenance() {
  return (
    <ListModule
      table="maintenance_requests"
      title="Repairs"
      desc="Water cooler, electrical faults, sockets, fixtures — anything floor- or room-related. The urgency meter helps the maintenance liaison triage."
      fields={[
        { name: 'name', label: 'Your name', type: 'select', options: ALL_PEOPLE },
        { name: 'room', label: 'Room number', type: 'text', placeholder: 'e.g. 46', required: true },
        { name: 'side', label: 'Side of room', type: 'select', options: ['Left', 'Right', 'N/A — common area'] },
        { name: 'category', label: 'Category', type: 'select', options: ['Water cooler', 'Electrical — socket', 'Electrical — light fixture', 'Electrical — other', 'Plumbing', 'Furniture', 'Other'] },
        { name: 'urgency', label: 'Urgency (1 = can wait, 5 = fix now)', type: 'range', min: 1, max: 5, default: 3 },
        { name: 'details', label: 'Describe the issue', type: 'textarea', placeholder: 'Socket near the study table sparked once, stopped working since', required: true },
      ]}
      resolveField="resolved"
      resolveLabel="Mark resolved"
      doneLabel="Resolved"
      sortBy={(a, b) => (a.resolved - b.resolved) || (b.urgency - a.urgency)}
      renderCard={row => ({
        title: `${row.category} · Room ${row.room}${row.side !== 'N/A — common area' ? ` (${row.side})` : ''}`,
        pill: <Pill tone={row.urgency >= 4 ? 'red' : 'blue'}>Urgency {row.urgency}/5</Pill>,
        meta: `${row.name} · ${fmtDate(row.created_at)}`,
        body: row.details,
        critical: row.urgency >= 4 && !row.resolved,
      })}
    />
  )
}
