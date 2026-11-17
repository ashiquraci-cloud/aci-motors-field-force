import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Upload from './pages/Upload.jsx'
import Timeline from './pages/Timeline.jsx'
import Review from './pages/Review.jsx'
import NotificationsPage from './pages/Notifications.jsx'
import Users from './pages/Users.jsx'
import Reports from './pages/Reports.jsx'
import Layout from './components/Layout.jsx'

function Guard({ children, adminOnly }) {
  const { profile, loading, isAdmin } = useAuth()
  const loc = useLocation()
  if (loading) return <div className="min-h-screen grid place-items-center bg-navy-900 text-white">Loading…</div>
  if (!profile) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Guard><Layout /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="timeline" element={<Timeline />} />
        <Route path="review" element={<Review />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Guard adminOnly><Users /></Guard>} />
      </Route>
    </Routes>
  )
}