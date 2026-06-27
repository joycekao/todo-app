import Alert from '@mui/material/Alert'

interface Props {
  message: string | null
  onDismiss: () => void
}

export default function ErrorBanner({ message, onDismiss }: Props) {
  if (!message) return null

  return (
    <Alert severity="error" onClose={onDismiss} sx={{ mb: 2 }}>
      {message}
    </Alert>
  )
}
