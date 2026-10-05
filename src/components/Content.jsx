import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { listAll, insertRow, deleteRow } from '../api'
import { useMe, slug, firstName } from '../identity'
import { SectionHead, Empty, fmtDate, RemoveMine } from './ui'
import { pushToast } from './Toast'
import { PostingAs } from './People'

const BUCKET = 'postcards'
const MAX_MB = 50
const publicUrl = (path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
const fmtDay = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

function Media({ post }) {
  const url = post.file_path ? publicUrl(post.file_path) : null
  if (!url) return <span className="postcard-ph">{post.type}</span>
  return post.file_type?.startsWith('video')
    ? <video src={url} controls playsInline preload="metadata" />
    : <img src={url} alt={post.caption || post.type} loading="lazy" />
}

function Uploader({ albumId, onDone }) {
  const me = useMe()
  const [files, setFiles] = useState([])
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  function pick(e) {
    const list = [...(e.target.files || [])]
    const tooBig = list.filter(f => f.size > MAX_MB * 1024 * 1024)
    setErr(tooBig.length ? `${tooBig.length} file(s) over ${MAX_MB} MB were skipped. Trim them or share a Drive link.` : '')
    setFiles(list.filter(f => f.size <= MAX_MB * 1024 * 1024))
  }

  async function upload(e) {
    e.preventDefault()
    if (!files.length) return setErr('Pick at least one photo or video.')
    setErr('')
    let done = 0
    for (const file of files) {
      setBusy(`Uploading ${done + 1} of ${files.length}…`)
      try {
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
        const path = `${albumId || 'loose'}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${slug(me)}.${ext}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
        if (error) throw error
        await insertRow('content_posts', {
          name: me, type: file.type.startsWith('video') ? 'Video' : 'Photo',
          caption: caption.trim() || null, file_path: path, file_type: file.type, album_id: albumId || null, link: null,
        })
        done++
      } catch (ex) {
        console.error(ex)
        setErr(`Uploaded ${done} of ${files.length}. The rest failed, check your connection and try again.`)
        break
      }
    }
    setBusy('')
    if (done) { pushToast(`${done} added`); setFiles([]); setCaption(''); e.target.reset(); onDone() }
  }

  return (
    <form className="inline-form" onSubmit={upload}>
      <PostingAs />
      <label className="upload-drop">
        <input type="file" accept="image/*,video/*" multiple onChange={pick} />
        <span className="upload-cta">
          <strong>{files.length ? `${files.length} selected, tap to change` : 'Tap to add photos or videos'}</strong>
          <span>Pick as many as you like. Up to {MAX_MB} MB each.</span>
        </span>
      </label>
      <div className="form-row"><div><label>Caption (optional)</label><input value={caption} onChange={e => setCaption(e.target.value)} placeholder="caption idea for these" /></div></div>
      {err && <div className="form-error" role="alert">{err}</div>}
      <button className="btn" type="submit" disabled={!!busy || !files.length}>{busy || 'Add to album'}</button>
    </form>
  )
}

function AlbumView({ album, posts, onBack, reload }) {
  const me = useMe()
  const mine = posts.filter(p => p.album_id === album.id)
  const people = [...new Set(mine.map(p => firstName(p.name)))]

  async function removePost(p) {
    if (p.file_path) await supabase.storage.from(BUCKET).remove([p.file_path])
    await deleteRow('content_posts', p.id)
    reload()
  }

  return (
    <div>
      <button className="link-btn" onClick={onBack}>‹ All albums</button>
      <SectionHead title={album.name} desc={`${fmtDay(album.event_date)} · ${mine.length} photos and videos${people.length ? ` from ${people.join(', ')}` : ''}. Anyone can add theirs.`} />
      <Uploader albumId={album.id} onDone={reload} />
      {mine.length ? (
        <div className="postcards">
          {mine.map(p => (
            <div className="postcard" key={p.id}>
              <div className="postcard-media"><Media post={p} /></div>
              {p.caption && <div className="postcard-caption">{p.caption}</div>}
              <div className="card-meta">{firstName(p.name)} · {fmtDate(p.created_at)}</div>
              <div className="postcard-links">
                {p.file_path && <a href={publicUrl(p.file_path)} download target="_blank" rel="noopener noreferrer">Download</a>}
                {p.name === me && <RemoveMine onRemove={() => removePost(p)} />}
              </div>
            </div>
          ))}
        </div>
      ) : <Empty>No photos yet. Add the first ones.</Empty>}
      {album.created_by === me && (
        <RemoveMine label="Delete this album" onRemove={async () => {
          const paths = mine.map(p => p.file_path).filter(Boolean)
          if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
          for (const p of mine) await deleteRow('content_posts', p.id)
          await deleteRow('albums', album.id)
          onBack(); reload()
        }} />
      )}
    </div>
  )
}

export default function Content() {
  const me = useMe()
  const [albums, setAlbums] = useState([])
  const [posts, setPosts] = useState([])
  const [open, setOpen] = useState(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  async function load() {
    const [a, p] = await Promise.all([listAll('albums', { ascending: false }), listAll('content_posts', { ascending: false })])
    setAlbums(a); setPosts(p)
  }
  useEffect(() => { load() }, [])

  async function create(e) {
    e.preventDefault()
    if (!name.trim()) return
    const row = await insertRow('albums', { name: name.trim(), event_date: date, created_by: me })
    setName(''); setCreating(false)
    await load()
    if (row) setOpen(row.id)
  }

  const album = albums.find(a => a.id === open)
  if (album) return <AlbumView album={album} posts={posts} onBack={() => setOpen(null)} reload={load} />

  const loose = posts.filter(p => !p.album_id)

  return (
    <div>
      <SectionHead title="Postcards" desc="Shared albums for every event. Start one with the event name and date, then everyone adds their photos and videos. Great for the @hotel.calii page." />
      <div className="subhead-row">
        <h3 className="subhead">Albums</h3>
        <button className="btn small" onClick={() => setCreating(c => !c)}>{creating ? 'Cancel' : 'New album'}</button>
      </div>
      {creating && (
        <form className="inline-form" onSubmit={create}>
          <div className="form-row">
            <div><label>Event name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. LitFest night" required maxLength={60} /></div>
            <div><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
          </div>
          <button className="btn" type="submit">Create album</button>
        </form>
      )}
      {albums.length ? (
        <div className="albums">
          {albums.map(a => {
            const items = posts.filter(p => p.album_id === a.id)
            const cover = items.find(p => p.file_path && !p.file_type?.startsWith('video'))
            return (
              <button key={a.id} className="album" onClick={() => setOpen(a.id)}>
                <span className="album-cover">
                  {cover ? <img src={publicUrl(cover.file_path)} alt="" loading="lazy" /> : <span className="postcard-ph">{items.length ? 'Videos' : 'Empty'}</span>}
                </span>
                <span className="album-name">{a.name}</span>
                <span className="card-meta">{fmtDay(a.event_date)} · {items.length} items</span>
              </button>
            )
          })}
        </div>
      ) : <Empty>No albums yet. Start one for the next event.</Empty>}

      {loose.length > 0 && (
        <>
          <h3 className="subhead">Loose postcards</h3>
          <div className="postcards">
            {loose.map(p => (
              <div className="postcard" key={p.id}>
                <div className="postcard-media"><Media post={p} /></div>
                {p.caption && <div className="postcard-caption">{p.caption}</div>}
                <div className="card-meta">{firstName(p.name)} · {fmtDate(p.created_at)}</div>
                <div className="postcard-links">
                  {p.file_path && <a href={publicUrl(p.file_path)} download target="_blank" rel="noopener noreferrer">Download</a>}
                  {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer">Open link</a>}
                  {p.name === me && <RemoveMine onRemove={async () => { if (p.file_path) await supabase.storage.from(BUCKET).remove([p.file_path]); await deleteRow('content_posts', p.id); load() }} />}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
