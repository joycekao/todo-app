import { todosReducer } from './todosReducer'
import { Todo } from '../api/todos'

const todo1: Todo = { id: 1, title: 'Buy milk', isCompleted: false, createdAt: '2024-01-01T00:00:00Z' }
const todo2: Todo = { id: 2, title: 'Walk dog', isCompleted: false, createdAt: '2024-01-02T00:00:00Z' }

describe('todosReducer', () => {
  it('SET replaces state with the provided todos', () => {
    const result = todosReducer([todo1], { type: 'SET', todos: [todo2] })
    expect(result).toEqual([todo2])
  })

  it('ADD appends a todo to the list', () => {
    const result = todosReducer([todo1], { type: 'ADD', todo: todo2 })
    expect(result).toEqual([todo1, todo2])
  })

  it('TOGGLE replaces the matching todo with the updated version', () => {
    const toggled = { ...todo1, isCompleted: true }
    const result = todosReducer([todo1, todo2], { type: 'TOGGLE', todo: toggled })
    expect(result[0].isCompleted).toBe(true)
    expect(result[1]).toEqual(todo2)
  })

  it('DELETE removes the todo with the matching id', () => {
    const result = todosReducer([todo1, todo2], { type: 'DELETE', id: 1 })
    expect(result).toEqual([todo2])
  })

  it('DELETE does nothing if id does not match', () => {
    const result = todosReducer([todo1], { type: 'DELETE', id: 99 })
    expect(result).toEqual([todo1])
  })
})
