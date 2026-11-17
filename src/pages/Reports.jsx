import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Reports() {
  const [files, setFiles] = useState([])
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('files').select('*').order('created_at', { ascending: false }).limit(500)
      setFiles(data || [])
    })()
  }, [])

  function csv() {
    const rows = [['code', 'sale_type', 'reg_type', 'business', 'status', 'created_at']]
    files.forEach(f => rows.push([f.code, f.sale_type, f.reg_type || 'new', f.business, f.status, f.created_at]))
    const s = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([s], { type: 'text/csv' }))
    a.download = 'report.csv'
    a.click()
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="font-extrabold">Reports</div>
      <button onClick={csv} className="mt-2 bg-navy-900 text-white px-4 py-2 rounded-xl text-sm">Export CSV</button>
      <div className="card mt-3 p-2">
        {files.map(f => (
          <div key={f.id} className="text-sm p-2 border-b last:border-0 flex justify-between">
            <span>{f.code} • {f.sale_type} • {f.business}</span>
            <span>{f.status}</span>
          </div>
        ))}
        {files.length === 0 && <div className="text-sm text-slate-400 p-3">No data.</div>}
      </div>
    </div>
  )
}
