import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

const BIZ = [
  { id: 'Foton', label: 'Foton', sub: 'FOTON', icon: 'Ⓕ' },
  { id: 'Mahindra', label: 'Mahindra', sub: '', icon: 'Ⓜ' },
  { id: 'Bus', label: 'Bus', sub: '🚌', icon: '🚌' }
]

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [business, setBusiness] = useState('Foton')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await login({ email, password: pw, business, remember })
      nav('/')
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-[480px] mx-auto px-5 pt-10 pb-8 text-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-green-600 grid place-items-center font-black">ACI</div>
          <div>
            <div className="font-extrabold">ACI MOTORS LTD.</div>
            <div className="text-xs opacity-70">MM MODULE</div>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold mt-6">Welcome Back!</h1>
        <p className="text-sm opacity-70 mt-1">Secure access to MM Module.<br />Please login to continue.</p>
      </div>
      <form onSubmit={submit} className="max-w-[480px] mx-auto bg-white rounded-t-[28px] p-5 min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-green-50 grid place-items-center">🔒</div>
          <div>
            <div className="font-extrabold text-navy-900 text-lg">MM Module Login</div>
            <div className="text-xs text-slate-500">Please select your business and login to continue</div>
          </div>
        </div>
        <div className="mt-5 font-bold text-sm">Select Business</div>
        <div className="text-xs text-slate-500">Choose your business to access the respective dashboard</div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {BIZ.map(b => (
            <button type="button" key={b.id} onClick={() => setBusiness(b.id)}
              className={`border rounded-xl py-3 text-sm font-bold relative ${business === b.id ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600'}`}>
              {business === b.id && <span className="absolute -top-2 -right-2 w-5 h-5 bg-green-600 text-white rounded-full text-xs grid place-items-center">✓</span>}
              <div className="text-2xl">{b.icon}</div>{b.label}
            </button>
          ))}
        </div>
        <div className="mt-5 font-bold text-sm">User Credentials</div>
        <div className="text-xs text-slate-500 mb-2">Enter your credentials to login</div>
        <div className="relative">
          <span className="absolute left-3 top-3 text-slate-400">👤</span>
          <input className="inp !pl-10" placeholder="Enter Staff ID / User ID" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="relative mt-3">
          <span className="absolute left-3 top-3 text-slate-400">🔒</span>
          <input className="inp !pl-10 pr-12" type={show ? 'text' : 'password'} placeholder="Enter Password" value={pw} onChange={e => setPw(e.target.value)} required />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3">👁</button>
        </div>
        <div className="flex justify-between items-center mt-3 text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Remember me
          </label>
          <a className="text-brand-600" href="#" onClick={e => e.preventDefault()}>Forgot Password?</a>
        </div>
        {err && <div className="mt-3 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{err}</div>}
        <button className="btn-primary mt-4" disabled={busy}>{busy ? 'Logging in…' : '🔒 Login'}</button>
        <div className="text-center text-xs text-slate-500 mt-3">🛡 Your information is secure and encrypted</div>
      </form>
    </div>
  )
}
