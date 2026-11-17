import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
}

export default function Users() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ name: '', email: '', staff_id: '', role: 'officer', business: 'Foton' })
  const [msg, setMsg] = useState('')

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setRows(data || [])
  }

  useEffect(() => { load() }, [])

  async function add(e) {
    e.preventDefault()
    setMsg('')
    const h = await sha(form.staff_id)
    const { error } = await supabase.from('profiles').insert({
      name: form.name, email: form.email.toLowerCase(), staff_id_hash: h, role: form.role, business: form.business
    })
    if (!error) {
      setMsg('User added.')
      setForm({ name: '', email: '', staff_id: '', role: 'officer', business: 'Foton' })
      load()
    } else setMsg(error.message)
  }

  async function csv(e) {
    const f = e.target.files[0]
    if (!f) return
    setMsg('Uploading CSV…')
    const t = await f.text()
    const lines = t.trim().split('\n')
    const head = lines[0].split(',').map(s => s.trim().toLowerCase())
    let n = 0
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split(',')
      const o = {}
      head.forEach((h, j) => o[h] = (c[j] || '').trim())
      if (!o.email) continue
      const h = await sha(o.staff_id || o.staffid || '1234')
      const { error } = await supabase.from('profiles').upsert({
        name: o.name || '', email: o.email.toLowerCase(), staff_id_hash: h,
        role: o.role || 'officer', business: o.business || 'Foton'
      }, { onConflict: 'email' })
      if (!error) n++
    }
    setMsg(`Imported ${n} users.`)
    load()
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="font-extrabold text-lg">Users (Admin only)</div>
      <div className="card p-4 mt-3">
        <div className="font-bold text-sm">Bulk CSV upload (name,email,staff_id,role,business)</div>
        <input type="file" accept=".csv" onChange={csv} className="mt-2 text-sm" />
        {msg && <div className="text-xs mt-2 text-slate-600">{msg}</div>}
      </div>
      <form onSubmit={add} className="card p-4 mt-3 grid md:grid-cols-5 gap-2">
        <input className="inp" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input className="inp" placeholder="official Gmail" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <input className="inp" placeholder="Staff ID (password)" value={form.staff_id} onChange={e => setForm({ ...form, staff_id: e.target.value })} required />
        <select className="inp" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
          <option value="officer">officer</option>
          <option value="admin">admin</option>
        </select>
        <select className="inp" value={form.business} onChange={e => setForm({ ...form, business: e.target.value })}>
          <option>Foton</option>
          <option>Mahindra</option>
          <option>Bus</option>
        </select>
        <button className="bg-navy-900 text-white rounded-xl md:col-span-5 py-2">Add user</button>
      </form>
      <div className="card mt-3 p-2">
        {rows.map(r => (
          <div key={r.id} className="flex justify-between items-center text-sm p-2 border-b last:border-0 gap-2">
            <span><b>{r.name}</b> • {r.email} • {r.role} • {r.business}</span>
            <button className="text-red-500 shrink-0" onClick={async () => { if (confirm('Remove?')) { await supabase.from('profiles').delete().eq('id', r.id); load() } }}>Remove</button>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-slate-400 p-3">No users yet.</div>}
      </div>
    </div>
  )
}
