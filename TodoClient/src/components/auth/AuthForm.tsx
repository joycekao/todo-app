import { ReactNode, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ErrorBanner from '../shared/ErrorBanner'
import { AUTH } from '../../constants/strings'

interface Props {
  title: string
  submitLabel: string
  onSubmit: (username: string, password: string) => Promise<void>
  footer: ReactNode
  // Client-side validation (used in RegisterForm and TodoList) mirrors backend rules to give
  // immediate feedback without a server round trip. The backend remains the authoritative check.
  validate?: (username: string, password: string) => string | null
}

export default function AuthForm({ title, submitLabel, onSubmit, footer, validate }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate) {
      const validationError = validate(username, password)
      if (validationError) { setError(validationError); return }
    }
    setLoading(true)
    setError(null)
    try {
      await onSubmit(username, password)
    } catch (err) {
      setError(err as string)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 10 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>{title}</Typography>
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label={AUTH.USERNAME_LABEL} value={username} onChange={e => setUsername(e.target.value)} fullWidth />
          <TextField label={AUTH.PASSWORD_LABEL} type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth />
          <Button type="submit" variant="contained" disabled={loading} fullWidth>
            {loading ? `${submitLabel}…` : submitLabel}
          </Button>
        </Box>
        <Box sx={{ textAlign: 'center', mt: 2 }}>{footer}</Box>
      </Paper>
    </Box>
  )
}
