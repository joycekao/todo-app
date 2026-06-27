import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import TodoList from './TodoList'
import { api } from '../../api/todos'

vi.mock('../../api/todos', () => ({
  api: {
    getTodos: vi.fn(),
    createTodo: vi.fn(),
    toggleTodo: vi.fn(),
    deleteTodo: vi.fn(),
  },
}))

const mockTodos = [
  { id: 1, title: 'Buy milk', isCompleted: false, createdAt: '2024-01-01T00:00:00Z' },
  { id: 2, title: 'Walk dog', isCompleted: false, createdAt: '2024-01-02T00:00:00Z' },
]

function renderTodoList() {
  render(
    <MemoryRouter>
      <TodoList onLogout={() => {}} />
    </MemoryRouter>
  )
}

describe('TodoList', () => {
  beforeEach(() => {
    vi.mocked(api.getTodos).mockResolvedValue(mockTodos)
  })

  afterEach(() => vi.clearAllMocks())

  it('loads and displays todos on mount', async () => {
    renderTodoList()
    expect(await screen.findByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByText('Walk dog')).toBeInTheDocument()
  })

  it('shows empty state when there are no todos', async () => {
    vi.mocked(api.getTodos).mockResolvedValue([])
    renderTodoList()
    expect(await screen.findByText('No todos yet. Add one above!')).toBeInTheDocument()
  })

  it('adds a new todo', async () => {
    const newTodo = { id: 3, title: 'Read book', isCompleted: false, createdAt: '2024-01-03T00:00:00Z' }
    vi.mocked(api.createTodo).mockResolvedValue(newTodo)
    renderTodoList()
    await screen.findByText('Buy milk')
    await userEvent.type(screen.getByPlaceholderText('Add a todo…'), 'Read book')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText('Read book')).toBeInTheDocument()
  })

  it('toggles a todo', async () => {
    const toggled = { ...mockTodos[0], isCompleted: true }
    vi.mocked(api.toggleTodo).mockResolvedValue(toggled)
    renderTodoList()
    const checkboxes = await screen.findAllByRole('checkbox')
    await userEvent.click(checkboxes[0])
    await waitFor(() => expect(checkboxes[0]).toBeChecked())
  })

  it('deletes a todo', async () => {
    vi.mocked(api.deleteTodo).mockResolvedValue(undefined)
    renderTodoList()
    await screen.findByText('Buy milk')
    const deleteButtons = screen.getAllByRole('button', { name: '' })
    await userEvent.click(deleteButtons[0])
    await waitFor(() => expect(screen.queryByText('Buy milk')).not.toBeInTheDocument())
  })

  it('shows an error banner when loading todos fails', async () => {
    vi.mocked(api.getTodos).mockRejectedValue('Failed to load')
    renderTodoList()
    expect(await screen.findByText('Failed to load')).toBeInTheDocument()
  })

  it('shows an error banner when adding a todo fails', async () => {
    vi.mocked(api.createTodo).mockRejectedValue('Failed to create')
    renderTodoList()
    await screen.findByText('Buy milk')
    await userEvent.type(screen.getByPlaceholderText('Add a todo…'), 'Read book')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText('Failed to create')).toBeInTheDocument()
  })

  it('shows a validation error and does not call createTodo when title is too long', async () => {
    renderTodoList()
    await screen.findByText('Buy milk')
    await userEvent.type(screen.getByPlaceholderText('Add a todo…'), 'a'.repeat(201))
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('Title must be 200 characters or fewer.')).toBeInTheDocument()
    expect(api.createTodo).not.toHaveBeenCalled()
  })
})
