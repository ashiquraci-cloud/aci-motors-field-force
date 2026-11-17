import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './lib/auth.jsx'
import { MISSING_ENV } from './lib/supabase.js'

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(e) { return { err: e } }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui' }}>
          <h2>Something failed to load</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#fee', padding: 12, borderRadius: 8 }}>
            {String(this.state.err?.message || this.state.err)}
          </pre>
          <p>Open Vercel deployment logs, or check Supabase env vars and redeploy.</p>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <Boundary>
    <BrowserRouter>
      <AuthProvider>
        {MISSING_ENV && (
          <div style={{ background: '#FEF3C7', color: '#92400E', padding: '10px 14px', fontSize: 13, textAlign: 'center', fontFamily: 'system-ui' }}>
            ⚠ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing on Vercel. Add both, then Redeploy.
          </div>
        )}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </Boundary>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}