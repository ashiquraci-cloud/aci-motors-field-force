import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'

const STEPS = [
  { k: 'file_received', label: 'File Received Date', icon: '🧾', c: 'bg-blue-600', sub: d => `Day 1 of 12 Days` },
  { k: 'approval', label: 'Approval Processing Status', icon: '👤', c: 'bg-green-600' },
  { k: 'payment', label: 'Registration Fee Payment Done On', icon: '💳', c: 'bg-blue-600' },
  { k: 'route_permit', label: 'Route Permit File Processing', icon: '📄', c: 'bg-orange-500' },
  { k: 'insurance', label: 'Insurance', icon: '🛡', c: 'bg-indigo-600' },
  { k: 'delivery', label: 'Delivery Status', icon: '🚚', c: 'bg-purple-700' },
  { k: 'paper', label: 'Paper Receiver (Mark as Received)', icon: '👤', c: 'bg-slate-400' }
]

const NOTIF_FOR_STEP = {
  approval: { type: 'approval_done', title: 'Approval Completed' },
  payment: { type: 'registration_done', title: 'Registration Completed' },
  route_permit: { type: 'route_permit', title: 'Route Permit Generated' },
  insurance: { type: 'insurance_ready', title: 'Insurance Ready' },
  delivery: { type: 'delivered', title: 'Delivered to Field Force' }
}

export default function Timeline() {
  const { profile, isAdmin } = useAuth()
  const [q, setQ] = useState('')
  const [file, setFile] = useState(null)
  const [err, setErr] = useState('')
  const [edit, setEdit] = useState({})
  const [saving, setSaving] = useState(false)

  async function search(code) {
    setErr('')
    const c = (code || q).trim().toUpperCase()
    if (!c) return
    const { data, error } = await supabase
      .from('files')
      .select('*, profiles!files_officer_id_fkey(name,email)')
      .eq('code', c)
      .maybeSingle()
    if (error || !data) { setErr('No file found'); setFile(null); return }
    if (!isAdmin && data.officer_id !== profile.id) { setErr('You can only view your own files'); setFile(null); return }
    setFile(data)
  }

  useEffect(() => {
    const ch = supabase
      .channel('tl')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'files' },
        p => { if (file && p.new.id === file.id) setFile(prev => ({ ...prev, ...p.new })) })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [file?.id])

  async function saveStep(k) {
    const val = edit[k]
    if (!val && k !== 'paper') return
    setSaving(true)
    try {
      const steps = { ...(file.steps || {}), [k]: { date: val || new Date().toISOString(), done: true, status: val } }
      const patch = { steps }
      if (k === 'delivery') patch.delivery_status = val
      if (k === 'paper') patch.paper_received_at = new Date().toISOString()
      const meta = NOTIF_FOR_STEP[k]
      if (meta && (k !== 'delivery' || val === 'Delivered')) {
        await supabase.from('notifications').insert({
          user_id: file.officer_id, file_id: file.id,
          type: meta.type, title: meta.title,
          body: `File ${file.code}: ${meta.title}.`, severity: 'info'
        })
      }
      if (val === 'Delivered' && k === 'delivery') {
        try { await supabase.functions.invoke('send-delivery-email', { body: { file_id: file.id } }) } catch {}
      }
      const { error } = await supabase.from('files').update(patch).eq('id', file.id)
      if (!error) { setFile({ ...file, ...patch, steps }); setEdit({}) }
      else setErr(error.message)
    } finally {
      setSaving(false)
    }
  }

  const left = file ? Math.max(0, 12 - Math.floor((Date.now() - new Date(file.created_at)) / 86400000)) : 12

  return (
    <div className="p-4 max-w-[480px] md:max-w-xl mx-auto">
      <div className="text-center font-extrabold text-navy-900">← LIVE TIMELINE
        <br /><span className="text-xs font-normal text-slate-500">Track coded file process in real-time</span>
      </div>
      <div className="flex gap-2 mt-3">
        <input className="inp" placeholder="Search by Code (e.g. H00233)" value={q} onChange={e => setQ(e.target.value)} />
        <button onClick={() => search()} className="bg-brand-600 text-white px-5 rounded-xl font-bold shrink-0">Search</button>
      </div>
      {err && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mt-2">{err}</div>}
      {file && (
        <div className="card p-4 mt-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-extrabold text-navy-900">📄 Code: {file.code}</div>
              <div className="text-xs text-slate-500">File Tracking & Process Timeline</div>
            </div>
            <div className="text-center bg-green-50 border border-green-200 rounded-xl px-3 py-1">
              <div className="text-[11px] text-green-700">Remaining Days</div>
              <div className="text-2xl font-extrabold text-green-600">{left}</div>
              <div className="text-[10px] text-green-700">{left} Days Left<br />(From {new Date(file.created_at).toLocaleDateString()})</div>
            </div>
          </div>
          <div className="mt-4">
            {STEPS.map((s, i) => {
              const st = file.steps?.[s.k]
              const done = st?.done || (s.k === 'delivery' && file.delivery_status === 'Delivered')
              return (
                <div key={s.k} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full text-white grid place-items-center shrink-0 ${s.c}`}>{s.icon}</div>
                    {i < STEPS.length - 1 && <div className="w-0.5 flex-1 min-h-[2.5rem] bg-slate-200" />}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="text-xs font-bold text-slate-700">{s.label}</div>
                    {s.k === 'paper' ? (
                      <>
                        <div className="text-[11px] text-slate-500">Click the button below when paper file is received from concerned person.</div>
                        {isAdmin
                          ? <div className="text-xs mt-1">Paper received: {file.paper_received_at ? new Date(file.paper_received_at).toLocaleString() : 'Not yet'}</div>
                          : <button disabled={!!file.paper_received_at || saving} onClick={() => saveStep('paper')}
                            className={`mt-2 px-4 py-2 rounded-lg text-white text-xs font-bold ${file.paper_received_at ? 'bg-green-600' : 'bg-brand-600'}`}>
                            {file.paper_received_at ? '✓ Paper Received' : 'Mark as Paper Received'}
                          </button>}
                      </>
                    ) : isAdmin && !done ? (
                      <div className="flex gap-1 mt-1">
                        <input type="date" className="inp !py-1 text-xs" value={edit[s.k] || ''}
                          onChange={e => setEdit({ ...edit, [s.k]: e.target.value })} />
                        <button disabled={saving} onClick={() => saveStep(s.k)} className="bg-navy-900 text-white px-3 rounded-lg text-xs shrink-0">Save</button>
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-blue-700">
                        {st?.date ? new Date(st.date).toLocaleDateString() : (file.delivery_status && s.k === 'delivery' ? file.delivery_status : (done ? 'Done' : 'On Process'))}
                      </div>
                    )}
                    {s.k === 'file_received' && <div className="text-[11px] text-slate-400">Day 1 of 12 Days</div>}
                    {s.k === 'approval' && st?.done && <div className="text-[11px] text-slate-400">Day 3 of 12 Days</div>}
                    {s.k === 'payment' && st?.done && <div className="text-[11px] text-slate-400">Day 5 of 12 Days</div>}
                  </div>
                  <div className="text-center text-[10px] text-slate-500 w-14 shrink-0">
                    <div>Remaining<br />Days</div>
                    <div className="text-lg font-extrabold text-green-600">{Math.max(0, left - i)}</div>
                    <div>Days Left</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">* Once you mark as received, the Field Force Received Date will be stored as proof.</div>
        </div>
      )}
    </div>
  )
}
