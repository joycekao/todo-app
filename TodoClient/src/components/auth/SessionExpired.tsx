import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { AUTH } from '../../constants/strings'

export default function SessionExpired() {
  const navigate = useNavigate()

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 10 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>{AUTH.SESSION_EXPIRED_TITLE}</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {AUTH.SESSION_EXPIRED_BODY}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/login')}>
          {AUTH.SESSION_EXPIRED_CTA}
        </Button>
      </Paper>
    </Box>
  )
}
