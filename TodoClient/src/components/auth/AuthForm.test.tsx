import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AuthForm from './AuthForm'

function renderAuthForm(onSubmit = vi.fn()) {
  render(
    <MemoryRouter>
      <AuthForm
        title="Log in"
        submitLabel="Log in"
        onSubmit={onSubmit}
        footer={<span>footer</span>}
      />
    </MemoryRouter>
  )
}

describe('AuthForm', () => {
  it('renders the title', () => {
    renderAuthForm()
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('renders the footer', () => {
    renderAuthForm()
    expect(screen.getByText('footer')).toBeInTheDocument()
  })

  it('calls onSubmit with username and password on submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderAuthForm(onSubmit)
    await userEvent.type(screen.getByLabelText('Username'), 'alice')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(onSubmit).toHaveBeenCalledWith('alice', 'secret')
  })

  it('disables the submit button while loading', async () => {
    const onSubmit = vi.fn(() => new Promise(() => {}))
    renderAuthForm(onSubmit)
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(screen.getByRole('button', { name: /log in/i })).toBeDisabled()
  })

  it('shows an error banner when onSubmit throws', async () => {
    const onSubmit = vi.fn().mockRejectedValue('Invalid credentials')
    renderAuthForm(onSubmit)
    await userEvent.type(screen.getByLabelText('Username'), 'alice')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
  })

  it('shows a validation error and does not call onSubmit when validate returns an error', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const validate = () => 'Password must be at least 8 characters.'
    render(
      <MemoryRouter>
        <AuthForm title="Register" submitLabel="Register" onSubmit={onSubmit} validate={validate} footer={null} />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('Username'), 'alice')
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
