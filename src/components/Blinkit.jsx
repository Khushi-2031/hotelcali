import ListModule, { fmtDate, Pill } from './ListModule'
import { ALL_PEOPLE } from '../data/roster'

export default function Blinkit() {
  return (
    <ListModule
      table="blinkit_orders"
      title="Collective Blinkit orders"
      desc="Drop what you need into the current run — one or two floor-wide orders go out each day. Mark it received once it lands."
      fields={[
        { name: 'name', label: 'Your name', type: 'select', options: ALL_PEOPLE },
        { name: 'item', label: 'Item(s)', type: 'text', placeholder: 'Maggi x4, ice cream tub', required: true },
        { name: 'run', label: 'Order run', type: 'select', options: ['Morning run', 'Evening run'] },
        { name: 'notes', label: 'Notes', type: 'text', placeholder: 'split with room 44' },
      ]}
      resolveField="done"
      resolveLabel="Mark delivered"
      doneLabel="Delivered"
      renderCard={row => ({
        title: row.item,
        pill: <Pill tone="blue">{row.run}</Pill>,
        meta: `${row.name} · ${fmtDate(row.created_at)}`,
        body: row.notes,
      })}
    />
  )
}
