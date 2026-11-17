import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { Link } from 'react-router-dom'

function pct(cur, prev) {
  if (!prev) return cur > 0 ? 100 : 0
  return Math.round((cur - prev) / prev * 100)
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuth()
  const [tab, setTab] = useState('new')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState([])

  async function load() {
    setLoading(true)
    let q = supabase.from('files').select('*').order('created_at', { ascending: false }).limit(500)
    if (!isAdmin) q = q.eq('officer_id', profile.id)
    const { data } = await q
    setFiles(data || [])
    let nq = supabase.from('notifications').select('*').eq('is_read', false).order('created_at', { ascending: false }).limit(10)
    if (!isAdmin) nq = nq.eq('user_id', profile.id)
    const { data: ntf } = await nq
    setAlerts((ntf || []).filter(n => n.severity === 'critical'))
    setLoading(false)
  }

  useEffect(() => {
    load()
    const ch = supabase
      .channel('dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const now = new Date()
  const cm = now.getMonth(), cy = now.getFullYear()
  const pm = cm === 0 ? 11 : cm - 1, py = cm === 0 ? cy - 1 : cy
  const inM = (d, m, y) => { const t = new Date(d); return t.getMonth() === m && t.getFullYear() === y }
  const scoped = files.filter(f => !tab || f.reg_type === tab || (!f.reg_type && tab === 'new'))
  const cur = scoped.filter(f => inM(f.created_at, cm, cy))
  const prev = scoped.filter(f => inM(f.created_at, pm, py))
  const complete = cur.filter(f => f.status === 'complete').length
  const incomplete = cur.length - complete
  const pComplete = prev.filter(f => f.status === 'complete').length
  const pIncomplete = prev.length - pComplete

  const cards = [
    { t: 'Total Invoice', v: cur.length, p: pct(cur.length, prev.length), icon: '🧾', c: 'bg-violet-600' },
    { t: 'Total Registration', v: cur.length, p: pct(cur.length, prev.length), icon: '🚚', c: 'bg-blue-600' },
    { t: 'Registration Complete', v: complete, p: pct(complete, pComplete), icon: '✅', c: 'bg-green-600' },
    { t: 'Registration Incomplete', v: incomplete, p: -pct(incomplete, pIncomplete), icon: '⌛', c: 'bg-orange-500' }
  ]

  const months = [...Array(6)].map((_, i) => {
    const d = new Date(cy, cm - 5 + i, 1)
    return { k: d.toLocaleString('en', { month: 'short' }), m: d.getMonth(), y: d.getFullYear() }
  })
  const trend = months.map(m => ({
    k: m.k,
    c: scoped.filter(f => inM(f.created_at, m.m, m.y) && f.status === 'complete').length,
    i: scoped.filter(f => inM(f.created_at, m.m, m.y) && f.status !== 'complete').length
  }))
  const maxT = Math.max(10, ...trend.map(t => Math.max(t.c, t.i)))
  const recent = scoped.filter(f => f.status !== 'complete').slice(0, 5)

  return (
    <div className="p-4 max-w-[480px] md:max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-extrabold text-navy-900">☰&nbsp;&nbsp;MM MODULE DASHBOARD</div>
          <div className="text-xs text-slate-500 ml-7">Welcome back, {profile?.name || 'Officer'}</div>
        </div>
        <Link to="/notifications" className="relative text-2xl">🔔
          {alerts.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full grid place-items-center">{alerts.length}</span>}
        </Link>
      </div>

      {alerts.length > 0 && (
        <div className="card mt-3 p-3 bg-red-50 border-red-200">
          {alerts.slice(0, 2).map(a => <div key={a.id} className="text-sm text-red-700">⚠ {a.title} — {a.body}</div>)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-3 text-sm font-bold">
        <button onClick={() => setTab('new')} className={`py-2 border-b-2 ${tab === 'new' ? 'border-brand-600 text-brand-600' : 'text-slate-400 border-transparent'}`}>🚚 New Registration</button>
        <button onClick={() => setTab('resale')} className={`py-2 border-b-2 ${tab === 'resale' ? 'border-brand-600 text-brand-600' : 'text-slate-400 border-transparent'}`}>🔄 Resale</button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        {cards.map(c => (
          <div key={c.t} className="card p-3">
            <div className="flex gap-2 items-center">
              <div className={`w-9 h-9 rounded-xl text-white grid place-items-center ${c.c}`}>{c.icon}</div>
              <div className="text-[12px] font-semibold leading-tight">{c.t}</div>
            </div>
            <div className="text-2xl font-extrabold mt-1">{loading ? '…' : c.v}</div>
            <div className="text-[11px] text-slate-500">This Month</div>
            <div className={`text-[11px] mt-1 rounded-lg py-1 text-center flex items-center justify-center gap-1 ${c.p >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              <span>{c.p >= 0 ? '↗' : '↘'}</span> {Math.abs(c.p)}% from last month
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-3 p-3 text-xs text-slate-600 flex gap-2">
        <span className="w-6 h-6 bg-blue-600 text-white rounded-full grid place-items-center shrink-0 font-bold">i</span>
        <span>When any incomplete registration is completed, it will automatically be added to <b className="text-green-600">'Registration Complete'</b> and reduced from <b className="text-orange-600">'Registration Incomplete'</b>.</span>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="card mt-3 p-3">
          <div className="font-bold text-sm">Registration Trend</div>
          <div className="flex gap-4 text-[11px] mt-1">
            <span className="text-blue-700">● Completed</span>
            <span className="text-orange-500">● - - Incomplete</span>
          </div>
          <svg viewBox="0 0 300 150" className="w-full mt-2">
            {[30, 55, 80, 105, 130].map(y => <line key={y} x1="30" x2="290" y1={y} y2={y} stroke="#eef2f7" />)}
            <polyline fill="none" stroke="#2056E0" strokeWidth="2"
              points={trend.map((t, i) => `${42 + i * 50},${125 - (t.c / maxT * 95)}`).join(' ')} />
            {trend.map((t, i) => <circle key={'c' + i} cx={42 + i * 50} cy={125 - (t.c / maxT * 95)} r="3" fill="#2056E0" />)}
            <polyline fill="none" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="2"
              points={trend.map((t, i) => `${42 + i * 50},${125 - (t.i / maxT * 95)}`).join(' ')} />
            {trend.map((t, i) => <circle key={'d' + i} cx={42 + i * 50} cy={125 - (t.i / maxT * 95)} r="3" fill="#f59e0b" />)}
            {trend.map((t, i) => <text key={t.k} x={42 + i * 50 - 8} y={142} fontSize="9" fill="#64748b">{t.k}</text>)}
          </svg>
        </div>

        <div className="card mt-3 p-4">
          <div className="font-bold text-sm">Registration Status Overview</div>
          <div className="flex items-center gap-4 mt-2">
            <svg viewBox="0 0 120 120" className="w-28 h-28">
              {(() => {
                const tot = Math.max(1, cur.length)
                const frac = complete / tot
                return (<>
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#f97316" strokeWidth="16" />
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#16a34a" strokeWidth="16"
                    strokeDasharray={`${frac * 283} 283`} transform="rotate(-90 60 60)" strokeLinecap="round" />
                  <text x="60" y="56" textAnchor="middle" fontSize="11" fontWeight="800">Total</text>
                  <text x="60" y="70" textAnchor="middle" fontSize="16" fontWeight="800">{cur.length}</text>
                  <text x="60" y="82" textAnchor="middle" fontSize="8" fill="#64748b">Registrations</text>
                </>)
              })()}
            </svg>
            <div className="text-xs">
              <div>🟢 Complete<br /><b>{complete} ({cur.length ? Math.round(complete / Math.max(1, cur.length) * 1000) / 10 : 0}%)</b></div>
              <div className="mt-2">🟠 Incomplete<br /><b>{incomplete} ({cur.length ? Math.round(incomplete / Math.max(1, cur.length) * 1000) / 10 : 0}%)</b></div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-3 p-3">
        <div className="flex justify-between">
          <div className="font-bold text-sm">Recent Incomplete Registrations</div>
          <Link to="/timeline" className="text-brand-600 text-xs">View All</Link>
        </div>
        {recent.map(f => {
          const days = Math.floor((Date.now() - new Date(f.created_at)) / 86400000)
          return (
            <div key={f.id} className="grid grid-cols-4 text-xs py-2 border-b last:border-0">
              <span className="text-brand-600 font-bold">{f.code}</span>
              <span>{f.customer_name || profile?.name || '—'}</span>
              <span className="hidden sm:block md:block">{f.vehicle_model || '—'}</span>
              <span className="text-red-500 font-bold text-right">{days} Day{days === 1 ? '' : 's'}</span>
            </div>
          )
        })}
        {recent.length === 0 && <div className="text-xs text-slate-400 py-2">All clear 🎉</div>}
      </div>
    </div>
  )
}
