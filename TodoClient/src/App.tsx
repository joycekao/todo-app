import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import LoginForm from './components/auth/LoginForm'
import RegisterForm from './components/auth/RegisterForm'
import SessionExpired from './components/auth/SessionExpired'
import TodoList from './components/todos/TodoList'
import { api, setUnauthorizedHandler } from './api/todos'

const INACTIVITY_MS = 30 * 60 * 1000

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  function login(newToken: string) {
    localStorage.setItem('token', newToken)
    setToken(newToken)
  }

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
  }

  return { token, login, logout }
}

function InactivityGuard({ onExpire }: { onExpire: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(onExpire, INACTIVITY_MS)
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onExpire])

  return null
}

export default function App() {
  const { token, login, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
      navigate('/session-expired')
    })
  }, [logout, navigate])

  async function handleLogout() {
    await api.logout().catch(() => {})
    logout()
    navigate('/login')
  }

  async function handleExpire() {
    await api.logout().catch(() => {})
    logout()
    navigate('/session-expired')
  }

  return (
    <>
      {token && <InactivityGuard onExpire={handleExpire} />}
      <Routes>
        <Route path="/" element={token ? <TodoList onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginForm onLogin={login} />} />
        <Route path="/register" element={token ? <Navigate to="/" replace /> : <RegisterForm onLogin={login} />} />
        <Route path="/session-expired" element={<SessionExpired />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
