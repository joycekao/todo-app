import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TodoItem from './TodoItem'
import { Todo } from '../../api/todos'

const todo: Todo = { id: 1, title: 'Buy milk', isCompleted: false, createdAt: '2024-01-01T00:00:00Z' }
const completedTodo: Todo = { ...todo, isCompleted: true }

describe('TodoItem', () => {
  it('renders the todo title', () => {
    render(<TodoItem todo={todo} onToggle={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
  })

  it('renders an unchecked checkbox when todo is not completed', () => {
    render(<TodoItem todo={todo} onToggle={() => {}} onDelete={() => {}} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('renders a checked checkbox when todo is completed', () => {
    render(<TodoItem todo={completedTodo} onToggle={() => {}} onDelete={() => {}} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('calls onToggle with the todo id when checkbox is clicked', async () => {
    const onToggle = vi.fn()
    render(<TodoItem todo={todo} onToggle={onToggle} onDelete={() => {}} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledWith(1)
  })

  it('calls onDelete with the todo id when delete button is clicked', async () => {
    const onDelete = vi.fn()
    render(<TodoItem todo={todo} onToggle={() => {}} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onDelete).toHaveBeenCalledWith(1)
  })
})
