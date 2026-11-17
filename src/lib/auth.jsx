import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const r = localStorage.getItem('aci_remember') === '1'
      const s = (r ? localStorage : sessionStorage).getItem('aci_session')
      if (s) {
        try {
          const p = JSON.parse(s)
          setUser({ email: p.email })
          setProfile(p)
        } catch {}
      }
      setLoading(false)
    })()
  }, [])

  async function login({ email, password, business, remember }) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()
    if (error) throw new Error('Login failed: ' + error.message)
    if (!data) throw new Error('No pre-registered user for this email')
    if (business && data.business && data.business !== business) throw new Error('Business mismatch for this user')
    const enc = new TextEncoder().encode(password)
    const buf = await crypto.subtle.digest('SHA-256', enc)
    const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
    if (hex !== data.staff_id_hash) throw new Error('Invalid staff ID / password')
    if (data.is_disabled) throw new Error('User disabled')
    const sess = { ...data, staff_id_hash: undefined }
    ;(remember ? localStorage : sessionStorage).setItem('aci_session', JSON.stringify(sess))
    localStorage.setItem('aci_remember', remember ? '1' : '0')
    setUser({ email: data.email })
    setProfile(sess)
    return sess
  }

  function logout() {
    localStorage.removeItem('aci_session')
    sessionStorage.removeItem('aci_session')
    setUser(null)
    setProfile(null)
  }

  return (
    <Ctx.Provider value={{ user, profile, loading, login, logout, isAdmin: profile?.role === 'admin' }}>
      {children}
    </Ctx.Provider>
  )
}
