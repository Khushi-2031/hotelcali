import { useEffect, useState } from 'react'

let pushToastImpl = () => {}
export function pushToast(msg) { pushToastImpl(msg) }

export default function Toast() {
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    pushToastImpl = (m) => {
      setMsg(m)
      clearTimeout(window.__toastTimer)
      window.__toastTimer = setTimeout(() => setMsg(null), 2200)
    }
  }, [])

  return <div className={`toast ${msg ? 'show' : ''}`}>{msg}</div>
}
