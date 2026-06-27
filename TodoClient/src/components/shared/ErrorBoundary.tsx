import { Component, ReactNode } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { ERRORS } from '../../constants/strings'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // In production, forward to an error monitoring service (e.g. Sentry):
    // Sentry.captureException(error, { extra: info })
    console.error('Unhandled error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" gap={2}>
          <Typography variant="h6">{ERRORS.SOMETHING_WENT_WRONG}</Typography>
          <Button variant="outlined" onClick={() => this.setState({ error: null })}>
            {ERRORS.TRY_AGAIN}
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
}
