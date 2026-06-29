import { useNavigate } from 'react-router-dom'
import Link from '@mui/material/Link'
import { api } from '../../api/todos'
import AuthForm from './AuthForm'
import { AUTH, ERRORS } from '../../constants/strings'

interface Props {
  onLogin: (token: string) => void
}

export default function RegisterForm({ onLogin }: Props) {
  const navigate = useNavigate()

  async function handleSubmit(username: string, password: string) {
    await api.register(username, password)
    const { token } = await api.login(username, password)
    onLogin(token)
    navigate('/')
  }

  function validate(username: string, password: string): string | null {
    if (username.length < 6) return ERRORS.USERNAME_TOO_SHORT
    if (username.length > 26) return ERRORS.USERNAME_TOO_LONG
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(username)) return ERRORS.USERNAME_INVALID_CHARS
    if (password.length < 16) return ERRORS.PASSWORD_TOO_SHORT
    if (password.length > 64) return ERRORS.PASSWORD_TOO_LONG
    return null
  }

  return (
    <AuthForm
      title={AUTH.REGISTER_TITLE}
      submitLabel={AUTH.REGISTER_SUBMIT}
      onSubmit={handleSubmit}
      validate={validate}
      footer={<>{AUTH.REGISTER_HAS_ACCOUNT} <Link component="button" onClick={() => navigate('/login')}>{AUTH.REGISTER_LOGIN_LINK}</Link></>}
    />
  )
}
