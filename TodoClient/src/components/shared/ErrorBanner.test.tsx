import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBanner from './ErrorBanner'

describe('ErrorBanner', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<ErrorBanner message={null} onDismiss={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the message when provided', () => {
    render(<ErrorBanner message="Something went wrong" onDismiss={() => {}} />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('calls onDismiss when the close button is clicked', async () => {
    const onDismiss = vi.fn()
    render(<ErrorBanner message="Something went wrong" onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
