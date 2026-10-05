import { useEffect, useState } from 'react'
import { listAll, insertRow, updateRow, deleteRow } from '../api'
import { SectionHead, Pill, Empty, fmtDate, RemoveMine } from './ui'
import { pushToast } from './Toast'
import { useMe } from '../identity'
import { PostingAs } from './People'

/**
 * Generic form + list screen driven by config.
 * fields: [{ name, label, type: 'select'|'text'|'textarea'|'range', options, placeholder, required }]
 * renderCard(row): returns { title, meta, body, pill, critical }
 * resolveField: name of boolean column that a "mark done" button flips, or null
 * resolveLabel / doneLabel: button text / done-state pill text
 */
export default function ListModule({ table, title, desc, fields, renderCard, resolveField, resolveLabel = 'Mark resolved', doneLabel = 'Resolved', sortBy, children, formTitle, submitLabel = 'Post', onPosted }) {
  const me = useMe()
  const initial = () => Object.fromEntries(fields.map(f => [f.name, f.type === 'me' ? me : f.type === 'range' ? (f.default ?? 3) : (f.default ?? f.options?.[0] ?? '')]))
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(initial)

  async function load() {
    let data = await listAll(table, { ascending: false })
    if (sortBy) data = data.sort(sortBy)
    setRows(data)
  }
  useEffect(() => { load() }, [])

  function setField(name, value) { setForm(f => ({ ...f, [name]: value })) }

  async function submit(e) {
    e.preventDefault()
    const payload = { ...form }
    fields.forEach(f => { if (f.type === 'me') payload[f.name] = me })
    fields.forEach(f => { if (f.type === 'range') payload[f.name] = Number(payload[f.name]) })
    if (resolveField) payload[resolveField] = false
    const saved = await insertRow(table, payload)
    if (onPosted) await onPosted(saved || payload)
    pushToast('Posted')
    setForm(initial())
    load()
  }

  async function resolve(row) {
    await updateRow(table, row.id, { [resolveField]: true })
    load()
  }

  return (
    <div>
      {title && <SectionHead title={title} desc={desc} />}
      {children}
      <form className="inline-form" onSubmit={submit}>
        {formTitle && <h3 className="form-title">{formTitle}</h3>}
        {fields.some(f => f.type === 'me') && <PostingAs />}
        <div className="form-row">
          {fields.filter(f => f.type !== 'me').map(f => (
            <div key={f.name}>
              <label>{f.label}</label>
              {f.type === 'select' && (
                <select value={form[f.name]} onChange={e => setField(f.name, e.target.value)}>
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
              )}
              {f.type === 'text' && (
                <input value={form[f.name]} onChange={e => setField(f.name, e.target.value)} placeholder={f.placeholder} required={f.required} />
              )}
              {f.type === 'textarea' && (
                <textarea value={form[f.name]} onChange={e => setField(f.name, e.target.value)} placeholder={f.placeholder} required={f.required} />
              )}
              {f.type === 'range' && (
                <>
                  <input type="range" min={f.min} max={f.max} value={form[f.name]} onChange={e => setField(f.name, e.target.value)} />
                  <output style={{ fontSize: 12, color: 'var(--text-lo)' }}>{form[f.name]}</output>
                </>
              )}
            </div>
          ))}
        </div>
        <button className="btn" type="submit">{submitLabel}</button>
      </form>

      {rows.length ? rows.map(row => {
        const c = renderCard(row)
        return (
          <div className={`card ${c.critical ? 'critical' : ''}`} key={row.id}>
            <div className="card-top">
              <span className="card-title">{c.title}</span>
              {c.pill}
            </div>
            {c.meta && <div className="card-meta">{c.meta}</div>}
            {c.body && <div className="card-body">{c.body}</div>}
            {resolveField && (
              row[resolveField]
                ? <div style={{ marginTop: 8 }}><Pill tone="teal">{doneLabel}</Pill></div>
                : <button className="btn small ghost" style={{ marginTop: 8 }} onClick={() => resolve(row)}>{resolveLabel}</button>
            )}
            {me && row.name === me && <div><RemoveMine onRemove={async () => { await deleteRow(table, row.id); load() }} /></div>}
          </div>
        )
      }) : <Empty>Nothing here yet. Be the first to post.</Empty>}
    </div>
  )
}

export { fmtDate, Pill }
