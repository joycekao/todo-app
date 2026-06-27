import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import CloseIcon from '@mui/icons-material/Close'
import { Todo } from '../../api/todos'

interface Props {
  todo: Todo
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}

export default function TodoItem({ todo, onToggle, onDelete }: Props) {
  return (
    <ListItem
      disableGutters
      secondaryAction={
        <IconButton edge="end" onClick={() => onDelete(todo.id)} color="error" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        <Checkbox checked={todo.isCompleted} onChange={() => onToggle(todo.id)} edge="start" />
      </ListItemIcon>
      <ListItemText
        primary={todo.title}
        sx={{ textDecoration: todo.isCompleted ? 'line-through' : 'none', color: todo.isCompleted ? 'text.disabled' : 'text.primary' }}
      />
    </ListItem>
  )
}
