// VITE_API_URL is set per environment (e.g. .env.development); falls back to localhost for convenience.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5000/api'

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = localStorage.getItem('token')
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401 && token && !isRetry) {
    const refreshed = await tryRefresh()
    if (refreshed) return request<T>(path, options, true)
    onUnauthorized?.()
    throw 'Session expired. Please log in again.'
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unknown error' }))
    throw body.message as string
  }

  return res.json()
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    const { token } = await res.json()
    localStorage.setItem('token', token)
    return true
  } catch {
    return false
  }
}

export interface Todo {
  id: number
  title: string
  isCompleted: boolean
  createdAt: string
}

export const api = {
  register: (username: string, password: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),

  login: (username: string, password: string) =>
    request<{ token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  getTodos: () =>
    request<Todo[]>('/todos'),

  createTodo: (title: string) =>
    request<Todo>('/todos', { method: 'POST', body: JSON.stringify({ title }) }),

  toggleTodo: (id: number) =>
    request<Todo>(`/todos/${id}`, { method: 'PUT' }),

  deleteTodo: (id: number) =>
    request(`/todos/${id}`, { method: 'DELETE' }),
}
