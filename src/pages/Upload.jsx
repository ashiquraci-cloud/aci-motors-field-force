import React, { useState } from 'react'
import { supabase, requiredDocs, DOC_LABEL } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'

const SLOTS = ['invoice', 'chalan', 'nid', 'chassis', 'tin']
const SLOT_SUB = {
  invoice: 'Upload invoice or temporary invoice',
  chalan: 'Upload delivery chalan',
  nid: 'Upload customer NID',
  chassis: 'Upload chassis number picture',
  tin: 'Upload TIN document'
}

export default function Upload() {
  const { profile } = useAuth()
  const [code, setCode] = useState('H00233')
  const [saleType, setSaleType] = useState('credit')
  const [files, setFiles] = useState({})
  const [uploading, setUploading] = useState({})
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const need = requiredDocs(saleType)
  const canSubmit = need.every(k => files[k]?.path) && code.trim().length >= 3

  async function pick(k, file) {
    if (!file) return
    setUploading(s => ({ ...s, [k]: true }))
    setErr('')
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${profile.id}/${(code || 'TMP').toUpperCase()}/${Date.now()}_${k}.${ext}`
      const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true, contentType: file.type })
      if (error) { setErr(error.message); return }
      setFiles(s => ({ ...s, [k]: { path, name: file.name || `${k}_${code}.${ext}` } }))
    } finally {
      setUploading(s => ({ ...s, [k]: false }))
    }
  }

  async function submit() {
    setErr('')
    setOk('')
    const c = code.trim().toUpperCase()
    if (!c) return setErr('Code is required')
    for (const k of need) {
      if (!files[k]) return setErr(saleType === 'cash' && k === 'tin'
        ? 'Please upload TIN document before submitting.'
        : 'Please upload all required documents to submit.')
    }
    const { data: ex } = await supabase.from('files').select('id').eq('code', c).maybeSingle()
    if (ex) return setErr('Code must be unique — this code already exists')
    const docs = {}
    for (const k of SLOTS) { if (files[k]) docs[k] = files[k] }
    const { data, error } = await supabase.from('files').insert({
      code: c,
      sale_type: saleType,
      reg_type: 'new',
      officer_id: profile.id,
      business: profile.business || 'Foton',
      status: 'incomplete',
      documents: docs,
      steps: { file_received: { date: new Date().toISOString(), done: true } }
    }).select().single()
    if (error) return setErr(error.message)
    await supabase.from('notifications').insert([
      { user_id: profile.id, file_id: data.id, type: 'new_file', title: 'New File Received', body: `File ${c} has been received successfully.`, severity: 'info' },
      { user_id: profile.id, file_id: data.id, type: 'approval_pending', title: 'Approval Pending', body: `File ${c} is waiting for approval.`, severity: 'critical', for_role: 'admin' }
    ])
    setOk(`File ${c} submitted!`)
    setCode('')
    setFiles({})
  }

  return (
    <div className="p-4 max-w-[480px] mx-auto">
      <div className="font-bold">← Upload Documents</div>
      <div className="card p-4 mt-3">
        <label className="text-xs font-bold">Code</label>
        <input className="inp mt-1" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="H00233" />
        {!code.trim() && <div className="text-red-500 text-xs mt-1">⚠ Required Field Empty</div>}

        <label className="text-xs font-bold mt-3 block">Type of Sale</label>
        <div className="grid grid-cols-2 gap-2 mt-1 bg-slate-100 rounded-xl p-1">
          <button type="button" onClick={() => setSaleType('credit')}
            className={`py-2 rounded-xl text-sm font-bold ${saleType === 'credit' ? 'bg-navy-900 text-white' : 'text-slate-500'}`}>Credit</button>
          <button type="button" onClick={() => setSaleType('cash')}
            className={`py-2 rounded-xl text-sm font-bold ${saleType === 'cash' ? 'bg-navy-900 text-white' : 'text-slate-500'}`}>Case (Cash)</button>
        </div>

        <div className="mt-4 space-y-4">
          {SLOTS.map((k, i) => {
            const isReq = need.includes(k)
            const up = files[k]
            return (
              <div key={k}>
                <div className="flex justify-between text-xs">
                  <span><b>{i + 1}.</b> {DOC_LABEL[k]}</span>
                  <span className={isReq ? 'text-red-500 font-bold' : 'text-slate-400'}>{isReq ? '* Required' : 'Optional'}</span>
                </div>
                <label className="mt-1 flex items-center justify-between border border-dashed rounded-xl px-3 py-3 bg-slate-50 cursor-pointer">
                  <span className="text-sm text-slate-600">
                    {up ? `📄 ${up.name}` : uploading[k] ? 'Uploading…' : '⤒ Add Picture'}
                  </span>
                  {up && <span className="w-6 h-6 bg-green-600 text-white rounded-full grid place-items-center text-sm shrink-0">✓</span>}
                  <input type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={e => pick(k, e.target.files[0])} />
                </label>
                {isReq && !up && <div className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ Required Field Empty</div>}
              </div>
            )
          })}
        </div>

        <button disabled={!canSubmit} onClick={submit}
          className={`w-full mt-4 py-3 rounded-xl font-bold ${canSubmit ? 'bg-navy-900 text-white' : 'bg-slate-200 text-slate-400'}`}>
          {canSubmit ? '✓ Submit' : '⊘ Submit'}
        </button>
        {!canSubmit && (
          <div className="text-red-500 text-xs mt-2 text-center">
            {saleType === 'cash' ? 'Please upload required TIN document to submit.' : 'Please upload all required documents to submit.'}
          </div>
        )}
        {err && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mt-2">{err}</div>}
        {ok && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-xl mt-2">{ok}</div>}
      </div>
    </div>
  )
}
