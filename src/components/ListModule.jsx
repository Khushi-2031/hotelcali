import { useEffect, useState } from 'react'
import { listAll, insertRow, updateRow } from '../api'
import { SectionHead, Pill, Empty, fmtDate } from './ui'
import { pushToast } from './Toast'

/**
 * Generic form + list screen driven by config.
 * fields: [{ name, label, type: 'select'|'text'|'textarea'|'range', options, placeholder, required }]
 * renderCard(row): returns { title, meta, body, pill, critical }
 * resolveField: name of boolean column that a "mark done" button flips, or null
 * resolveLabel / doneLabel: button text / done-state pill text
 */
export default function ListModule({ table, title, desc, fields, renderCard, resolveField, resolveLabel = 'Mark resolved', doneLabel = 'Resolved', sortBy }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(() => Object.fromEntries(fields.map(f => [f.name, f.type === 'range' ? (f.default ?? 3) : (f.options?.[0] ?? '')])))

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
    fields.forEach(f => { if (f.type === 'range') payload[f.name] = Number(payload[f.name]) })
    if (resolveField) payload[resolveField] = false
    await insertRow(table, payload)
    pushToast('Posted')
    setForm(Object.fromEntries(fields.map(f => [f.name, f.type === 'range' ? (f.default ?? 3) : (f.options?.[0] ?? '')])))
    load()
  }

  async function resolve(row) {
    await updateRow(table, row.id, { [resolveField]: true })
    load()
  }

  return (
    <div>
      <SectionHead title={title} desc={desc} />
      <form className="inline-form" onSubmit={submit}>
        <div className="form-row">
          {fields.map(f => (
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
        <button className="btn" type="submit">Post</button>
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
          </div>
        )
      }) : <Empty>Nothing here yet — be the first to post.</Empty>}
    </div>
  )
}

export { fmtDate, Pill }
