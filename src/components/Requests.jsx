import ListModule, { fmtDate, Pill } from './ListModule'
import { ALL_PEOPLE } from '../data/roster'

export default function Requests() {
  return (
    <ListModule
      table="general_requests"
      title="Other requests & complaints"
      desc="Anything that doesn't fit elsewhere — single room requests, roommate swaps, general floor complaints."
      fields={[
        { name: 'name', label: 'Your name', type: 'select', options: ALL_PEOPLE },
        { name: 'category', label: 'Category', type: 'select', options: ['Single room request', 'Roommate swap', 'General complaint', 'Other'] },
        { name: 'details', label: 'Details', type: 'textarea', required: true },
      ]}
      resolveField="resolved"
      resolveLabel="Mark closed"
      doneLabel="Closed"
      renderCard={row => ({
        title: row.category,
        pill: !row.resolved ? <Pill tone="blue">Open</Pill> : null,
        meta: `${row.name} · ${fmtDate(row.created_at)}`,
        body: row.details,
      })}
    />
  )
}
