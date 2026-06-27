import { useEffect, useReducer, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { api } from '../../api/todos'
import { todosReducer } from '../../reducers/todosReducer'
import ErrorBanner from '../shared/ErrorBanner'
import TodoItem from './TodoItem'
import { ERRORS, TODOS } from '../../constants/strings'

interface Props {
  onLogout: () => void
}

export default function TodoList({ onLogout }: Props) {
  const [todos, dispatch] = useReducer(todosReducer, [])
  const [newTitle, setNewTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getTodos()
      .then(todos => dispatch({ type: 'SET', todos }))
      .catch(err => setError(err as string))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    if (newTitle.trim().length > 200) { setError(ERRORS.TITLE_TOO_LONG); return }
    setError(null)
    try {
      const todo = await api.createTodo(newTitle.trim())
      dispatch({ type: 'ADD', todo })
      setNewTitle('')
    } catch (err) {
      setError(err as string)
    }
  }

  async function handleToggle(id: number) {
    setError(null)
    try {
      const todo = await api.toggleTodo(id)
      dispatch({ type: 'TOGGLE', todo })
    } catch (err) {
      setError(err as string)
    }
  }

  async function handleDelete(id: number) {
    setError(null)
    try {
      await api.deleteTodo(id)
      dispatch({ type: 'DELETE', id })
    } catch (err) {
      setError(err as string)
    }
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', mt: 6, px: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">{TODOS.PAGE_TITLE}</Typography>
        <Button variant="outlined" size="small" onClick={onLogout}>{TODOS.LOGOUT_BUTTON}</Button>
      </Box>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder={TODOS.ADD_PLACEHOLDER}
          size="small"
          fullWidth
        />
        <Button type="submit" variant="contained">{TODOS.ADD_BUTTON}</Button>
      </Box>

      {loading && <Typography color="text.secondary">{TODOS.LOADING}</Typography>}

      <List disablePadding>
        {todos.map(todo => (
          <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} onDelete={handleDelete} />
        ))}
      </List>

      {!loading && todos.length === 0 && (
        <Typography color="text.secondary" textAlign="center">{TODOS.EMPTY}</Typography>
      )}
    </Box>
  )
}
