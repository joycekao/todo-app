import { useNavigate } from 'react-router-dom'
import Link from '@mui/material/Link'
import { api } from '../../api/todos'
import AuthForm from './AuthForm'
import { AUTH } from '../../constants/strings'

interface Props {
  onLogin: (token: string) => void
}

export default function LoginForm({ onLogin }: Props) {
  const navigate = useNavigate()

  async function handleSubmit(username: string, password: string) {
    const { token } = await api.login(username, password)
    onLogin(token)
    navigate('/')
  }

  return (
    <AuthForm
      title={AUTH.LOGIN_TITLE}
      submitLabel={AUTH.LOGIN_SUBMIT}
      onSubmit={handleSubmit}
      footer={<>{AUTH.LOGIN_NO_ACCOUNT} <Link component="button" onClick={() => navigate('/register')}>{AUTH.LOGIN_REGISTER_LINK}</Link></>}
    />
  )
}
