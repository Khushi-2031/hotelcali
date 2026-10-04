import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { listAll, insertRow } from '../api'
import { ALL_PEOPLE } from '../data/roster'
import { useMe, slug } from '../identity'
import { SectionHead, Empty, fmtDate } from './ui'
import { pushToast } from './Toast'

const BUCKET = 'postcards'
const MAX_MB = 50
const TYPES = ['Photo', 'Video', 'Reel-worthy moment']

const publicUrl = (path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

export default function Content() {
  const me = useMe()
  const [rows, setRows] = useState([])
  const [name, setName] = useState(me || ALL_PEOPLE[0])
  const [type, setType] = useState(TYPES[0])
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [link, setLink] = useState('')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { if (me) setName(me) }, [me])

  async function load() { setRows(await listAll('content_posts', { ascending: false })) }
  useEffect(() => { load() }, [])

  function pick(e) {
    const f = e.target.files?.[0]
    setErr('')
    if (!f) { setFile(null); setPreview(null); return }
    if (f.size > MAX_MB * 1024 * 1024) { setErr(`That file is over ${MAX_MB} MB. Trim the video or share a Drive link instead.`); e.target.value = ''; return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    if (f.type.startsWith('video')) setType(t => t === 'Photo' ? 'Video' : t)
  }

  async function submit(e) {
    e.preventDefault()
    if (!file && !link.trim()) { setErr('Add a photo or video, or paste a link.'); return }
    setBusy(true); setErr('')
    try {
      let file_path = null, file_type = null
      if (file) {
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
        file_path = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${slug(name)}.${ext}`
        const { error } = await supabase.storage.from(BUCKET).upload(file_path, file, { contentType: file.type, upsert: false })
        if (error) throw error
        file_type = file.type
      }
      await insertRow('content_posts', { name, type, link: link.trim() || null, caption, file_path, file_type })
      pushToast('Postcard mailed')
      setFile(null); setPreview(null); setLink(''); setCaption('')
      e.target.reset()
      load()
    } catch (ex) {
      console.error(ex)
      setErr('Upload failed. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <SectionHead title="Postcards" desc="Upload photos and videos straight from your phone for the @hotel.calii page. Admins see everything here and get an email for each new one." />
      <form className="inline-form" onSubmit={submit}>
        <div className="form-row">
          <div>
            <label>Your name</label>
            <select value={name} onChange={e => setName(e.target.value)}>{ALL_PEOPLE.map(p => <option key={p}>{p}</option>)}</select>
          </div>
          <div>
            <label>Type</label>
            <select value={type} onChange={e => setType(e.target.value)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
          </div>
        </div>
        <label className="upload-drop">
          <input type="file" accept="image/*,video/*" onChange={pick} />
          {preview ? (
            file?.type.startsWith('video') ? <video src={preview} muted playsInline controls className="upload-preview" /> : <img src={preview} alt="Selected upload" className="upload-preview" />
          ) : (
            <span className="upload-cta">
              <strong>Tap to add a photo or video</strong>
              <span>Up to {MAX_MB} MB, straight from your camera roll</span>
            </span>
          )}
        </label>
        <div className="form-row">
          <div><label>Or a link instead</label><input value={link} onChange={e => setLink(e.target.value)} placeholder="Drive / Photos link, for big videos" /></div>
        </div>
        <div className="form-row">
          <div><label>Caption idea</label><textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="suggested caption for the post" /></div>
        </div>
        {err && <div className="form-error" role="alert">{err}</div>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Mail the postcard'}</button>
      </form>

      <h3 className="subhead">In the mailbox</h3>
      {rows.length ? (
        <div className="postcards">
          {rows.map(r => {
            const url = r.file_path ? publicUrl(r.file_path) : null
            const isVideo = r.file_type?.startsWith('video')
            return (
              <div className="postcard" key={r.id}>
                <div className="postcard-media">
                  {url ? (isVideo ? <video src={url} controls playsInline preload="metadata" /> : <img src={url} alt={r.caption || r.type} loading="lazy" />)
                    : <span className="postcard-ph">{r.type}</span>}
                </div>
                {r.caption && <div className="postcard-caption">{r.caption}</div>}
                <div className="card-meta">{r.name} · {fmtDate(r.created_at)}</div>
                <div className="postcard-links">
                  {url && <a href={url} download target="_blank" rel="noopener noreferrer">Download</a>}
                  {r.link && <a href={r.link} target="_blank" rel="noopener noreferrer">Open link</a>}
                </div>
              </div>
            )
          })}
        </div>
      ) : <Empty>The mailbox is empty. Send the first postcard.</Empty>}
    </div>
  )
}
