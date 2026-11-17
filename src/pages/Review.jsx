import React, { useEffect, useState } from 'react'
import { supabase, DOC_LABEL } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'

export default function Review() {
  const { isAdmin } = useAuth()
  const [files, setFiles] = useState([])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data } = await supabase
        .from('files')
        .select('*, profiles!files_officer_id_fkey(name,email)')
        .order('created_at', { ascending: false })
        .limit(200)
      setFiles(data || [])
      if (data?.[0]) setSel(data[0])
      setLoading(false)
    })()
  }, [])

  const list = files.filter(f =>
    !q || f.code.includes(q.toUpperCase()) || f.profiles?.name?.toLowerCase().includes(q.toLowerCase()))

  async function signed(path) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600)
    return data?.signedUrl
  }

  if (!isAdmin) return <div className="p-6">Officers cannot access Document Review.</div>

  return (
    <div className="flex min-h-screen">
      <div className="w-72 bg-white border-r border-slate-100 p-3 hidden md:flex md:flex-col gap-1">
        <div className="font-extrabold text-sm p-2">Filter files</div>
        <input className="inp" placeholder="Filter by officer/code" value={q} onChange={e => setQ(e.target.value)} />
        <div className="mt-2 space-y-1 max-h-[80vh] overflow-auto">
          {list.map(f => (
            <button key={f.id} onClick={() => setSel(f)}
              className={`w-full text-left p-2 rounded-xl text-sm ${sel?.id === f.id ? 'bg-brand-100' : 'hover:bg-slate-50'}`}>
              <b>{f.code}</b> <span className="text-xs text-slate-500 capitalize">{f.sale_type}</span>
              <br /><span className="text-xs text-slate-500">{f.profiles?.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4 bg-bg">
        <div className="md:hidden">
          <input className="inp" placeholder="Filter by officer/code" value={q} onChange={e => setQ(e.target.value)} />
          <select className="inp mt-2" value={sel?.id || ''} onChange={e => setSel(files.find(f => f.id === e.target.value))}>
            {list.map(f => <option key={f.id} value={f.id}>{f.code} — {f.profiles?.name}</option>)}
          </select>
        </div>
        {loading ? <div className="p-6 text-slate-400 text-sm">Loading…</div>
        : !sel ? <div className="p-6 text-slate-400 text-sm">Select a file</div> : (
          <>
            <div className="card p-4 flex flex-wrap gap-x-8 gap-y-3 mt-3 md:mt-0">
              <div>
                <div className="text-xs text-slate-500">📄 Code</div>
                <div className="text-2xl font-extrabold text-brand-600">{sel.code}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Type of Sale</div>
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold capitalize inline-block">🔄 {sel.sale_type}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Uploaded By</div>
                <div className="font-bold text-sm">👤 {sel.profiles?.name}<br /><span className="text-xs font-normal text-slate-500">Field Force Officer</span></div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Uploaded On</div>
                <div className="font-bold text-sm">📅 {new Date(sel.created_at).toLocaleString()}</div>
              </div>
            </div>
            <h3 className="font-bold mt-4">Uploaded Documents</h3>
            <div className="grid md:grid-cols-3 gap-3 mt-2">
              {Object.keys(DOC_LABEL).map((k, i) => {
                const d = sel.documents?.[k]
                return (
                  <div key={k} className="card p-3">
                    <div className="font-bold text-sm">
                      <span className="bg-brand-600 text-white w-6 h-6 inline-grid place-items-center rounded-md mr-2">{i + 1}</span>
                      {DOC_LABEL[k]}
                    </div>
                    <div className="mt-2 bg-slate-50 border border-dashed border-slate-200 rounded-xl h-40 grid place-items-center text-xs text-slate-400 overflow-hidden">
                      {d ? <span className="p-2 break-all">📄 {d.name || d.path}</span> : 'Not uploaded'}
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                      <span>📅 Uploaded on {new Date(sel.created_at).toLocaleString()}</span>
                      {d && (
                        <span className="flex gap-3">
                          <a className="text-brand-600 font-bold" href="#" onClick={async e => { e.preventDefault(); const u = await signed(d.path); window.open(u, '_blank') }}>View Full ⤢</a>
                          <a className="text-brand-600 font-bold" href="#" onClick={async e => { e.preventDefault(); const u = await signed(d.path); const a = document.createElement('a'); a.href = u; a.download = d.name || k; a.click() }}>⤓</a>
                        </span>
                      )}
                    </div>
                    {d && (
                      <button className="mt-2 w-full bg-brand-600 text-white text-xs py-2 rounded-lg"
                        onClick={async () => { const u = await signed(d.path); const a = document.createElement('a'); a.href = u; a.download = d.name || k; a.click() }}>
                        Download PDF
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <button className="mt-3 bg-navy-900 text-white px-5 py-2 rounded-xl text-sm"
              onClick={async () => {
                for (const k of Object.keys(sel.documents || {})) {
                  const u = await signed(sel.documents[k].path)
                  if (u) window.open(u, '_blank')
                }
              }}>
              Download Combined PDF (opens all)
            </button>
          </>
        )}
      </div>
    </div>
  )
}
