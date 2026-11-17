import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'

const ICONS = {
  new_file: ['📄', 'bg-blue-100'],
  approval_pending: ['👤', 'bg-orange-100'],
  approval_done: ['✅', 'bg-yellow-100'],
  registration_done: ['🧾', 'bg-green-100'],
  route_permit: ['🅰', 'bg-teal-100'],
  insurance_ready: ['🛡', 'bg-blue-100'],
  delivered: ['🚚', 'bg-indigo-100']
}

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'Just now'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}

export default function NotificationsPage() {
  const { profile, isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    let qb = supabase.from('notifications').select('*, files(code)').order('created_at', { ascending: false }).limit(100)
    if (!isAdmin) qb = qb.eq('user_id', profile.id)
    const { data } = await qb
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const ch = supabase
      .channel('ntf')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function read(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    load()
  }

  async function readAll() {
    const ids = items.filter(i => !i.is_read).map(i => i.id)
    if (!ids.length) return
    if (!isAdmin) {
      for (const id of ids) await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    } else {
      for (const id of ids) await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    }
    load()
  }

  const shown = items.filter(n =>
    !q || (n.title + ' ' + n.body + ' ' + (n.files?.code || '')).toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="p-4 max-w-[480px] md:max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <span className="font-extrabold">←</span>
        <span className="font-extrabold">Notifications</span>
        <span className="flex gap-2 items-center">
          <input className="hidden md:block inp !w-48 !py-1 text-xs" placeholder="Filter…" value={q} onChange={e => setQ(e.target.value)} />
          <button onClick={readAll} className="text-slate-400" title="Mark all read">⋮</button>
        </span>
      </div>
      {loading ? <div className="card p-6 mt-3 text-center text-sm text-slate-400">Loading…</div>
      : (
        <div className="space-y-2 mt-3">
          {shown.map(n => {
            const [ic, bg] = ICONS[n.type] || ['🔔', 'bg-slate-100']
            return (
              <div key={n.id} className="card p-3 flex gap-3 items-start">
                <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${bg}`}>{ic}</div>
                <div className="flex-1 cursor-pointer" onClick={() => !n.is_read && read(n.id)}>
                  <div className="font-bold text-sm">{n.title}</div>
                  <div className="text-xs text-slate-500">{n.body}</div>
                </div>
                <div className="text-[11px] text-slate-400 text-right shrink-0">
                  {timeAgo(n.created_at)}
                  {!n.is_read && <span className="block w-2 h-2 bg-blue-600 rounded-full ml-auto mt-1" />}
                </div>
              </div>
            )
          })}
          {shown.length === 0 && <div className="card p-6 text-center text-slate-400 text-sm">No notifications</div>}
        </div>
      )}
    </div>
  )
}
