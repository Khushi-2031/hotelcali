import ListModule, { fmtDate, Pill } from './ListModule'
import { ALL_PEOPLE } from '../data/roster'

export default function Spc() {
  return (
    <ListModule
      table="spc_requests"
      title="SPC Desk"
      desc="Anything that needs Vismay or Simran's attention as the floor's SPC reps."
      fields={[
        { name: 'name', label: 'Your name', type: 'select', options: ALL_PEOPLE },
        { name: 'to_person', label: 'Addressed to', type: 'select', options: ['Vismay', 'Simran', 'Either'] },
        { name: 'details', label: 'Request', type: 'textarea', required: true },
      ]}
      resolveField="resolved"
      resolveLabel="Mark handled"
      doneLabel="Handled"
      renderCard={row => ({
        title: `For ${row.to_person}`,
        pill: !row.resolved ? <Pill tone="blue">Open</Pill> : null,
        meta: `${row.name} · ${fmtDate(row.created_at)}`,
        body: row.details,
      })}
    />
  )
}
