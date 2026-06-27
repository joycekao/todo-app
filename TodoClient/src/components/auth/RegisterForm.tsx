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
    if (username.length > 50) return ERRORS.USERNAME_TOO_LONG
    if (password.length < 8) return ERRORS.PASSWORD_TOO_SHORT
    if (password.length > 100) return ERRORS.PASSWORD_TOO_LONG
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
