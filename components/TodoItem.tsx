'use client'

import { useState } from 'react'
import { Check, Trash2, Edit3, X, Save, Loader2 } from 'lucide-react'

export interface Todo {
  id: string
  user_id: string
  title: string
  is_complete: boolean
  created_at: string
}

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string, is_complete: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onEdit: (id: string, newTitle: string) => Promise<void>
}

export default function TodoItem({ todo, onToggle, onDelete, onEdit }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  const handleSave = async () => {
    if (!editTitle.trim() || editTitle === todo.title) {
      setIsEditing(false)
      setEditTitle(todo.title)
      return
    }

    setIsSaving(true)
    try {
      await onEdit(todo.id, editTitle.trim())
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditTitle(todo.title)
      setIsEditing(false)
    }
  }

  const handleToggle = async () => {
    setIsToggling(true)
    try {
      await onToggle(todo.id, !todo.is_complete)
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus todo ini?')) {
      setIsDeleting(true)
      try {
        await onDelete(todo.id)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const formattedDate = new Date(todo.created_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
        todo.is_complete
          ? 'bg-slate-50/70 border-slate-200/60'
          : 'bg-white border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
        {/* Toggle Complete Checkbox */}
        <button
          type="button"
          disabled={isToggling || isDeleting}
          onClick={handleToggle}
          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
            todo.is_complete
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
              : 'border-slate-300 hover:border-indigo-500 bg-white'
          } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
          aria-label={todo.is_complete ? 'Tandai belum selesai' : 'Tandai selesai'}
        >
          {isToggling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
          ) : todo.is_complete ? (
            <Check className="w-4 h-4 stroke-[3]" />
          ) : null}
        </button>

        {/* Content / Edit Input */}
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              className="w-full px-3 py-1.5 text-sm bg-white border border-indigo-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
              title="Simpan (Enter)"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditTitle(todo.title)
                setIsEditing(false)
              }}
              disabled={isSaving}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              title="Batal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm break-words transition-colors ${
                todo.is_complete
                  ? 'line-through text-slate-400'
                  : 'text-slate-800 font-medium'
              }`}
            >
              {todo.title}
            </p>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {formattedDate}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isDeleting || isToggling}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            title="Edit todo"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isToggling}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Hapus todo"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}

