import { Todo } from '../api/todos'

// Centralises all todo state update logic in one place rather than scattering
// array mutations across individual handlers in TodoList. Each action type maps
// to a single, predictable state transition, making it easy to extend as new
// actions are added.
export type Action =
  | { type: 'SET'; todos: Todo[] }
  | { type: 'ADD'; todo: Todo }
  | { type: 'TOGGLE'; todo: Todo }
  | { type: 'DELETE'; id: number }

export function todosReducer(state: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case 'SET':    return action.todos
    case 'ADD':    return [...state, action.todo]
    case 'TOGGLE': return state.map(t => t.id === action.todo.id ? action.todo : t)
    case 'DELETE': return state.filter(t => t.id !== action.id)
  }
}
