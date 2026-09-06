import ListModule, { fmtDate } from './ListModule'
import { ALL_PEOPLE } from '../data/roster'

export default function Content() {
  return (
    <ListModule
      table="content_posts"
      title="Content drop for the cohort page"
      desc="This can't host photo/video files directly — drop a caption plus a link (Drive, Photos, wherever it's uploaded) and whoever runs the Instagram page can pull from here."
      fields={[
        { name: 'name', label: 'Your name', type: 'select', options: ALL_PEOPLE },
        { name: 'type', label: 'Type', type: 'select', options: ['Photo', 'Video', 'Reel-worthy moment'] },
        { name: 'link', label: 'Link to the file', type: 'text', placeholder: 'Drive / Photos link', required: true },
        { name: 'caption', label: 'Caption idea', type: 'textarea', placeholder: 'suggested caption for the post' },
      ]}
      renderCard={row => ({
        title: row.type,
        meta: `${row.name} · ${fmtDate(row.created_at)}`,
        body: (
          <>
            <a href={row.link} target="_blank" rel="noopener noreferrer">{row.link}</a>
            {row.caption && <><br />“{row.caption}”</>}
          </>
        ),
      })}
    />
  )
}
