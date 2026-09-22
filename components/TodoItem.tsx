'use client'

import { useState } from 'react'
import { Check, Trash2, Edit3, X, Save, Loader2, Image as ImageIcon, ZoomIn } from 'lucide-react'

export interface Todo {
  id: string
  user_id: string
  title: string
  is_complete: boolean
  image_url?: string | null
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
  const [showImagePreview, setShowImagePreview] = useState(false)

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
    <>
      <div
        className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
          todo.is_complete
            ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800'
            : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-500/40 hover:shadow-md'
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
                : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white dark:bg-slate-800'
            } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
            aria-label={todo.is_complete ? 'Tandai belum selesai' : 'Tandai selesai'}
          >
            {isToggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
            ) : todo.is_complete ? (
              <Check className="w-4 h-4 stroke-[3]" />
            ) : null}
          </button>

          {/* Thumbnail Gambar (jika ada) */}
          {todo.image_url && (
            <button
              type="button"
              onClick={() => setShowImagePreview(true)}
              className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 group/img focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Klik untuk memperbesar gambar"
            >
              <img
                src={todo.image_url}
                alt={todo.title}
                className="w-full h-full object-cover transition-transform duration-200 group-hover/img:scale-110"
              />
              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ZoomIn className="w-4 h-4" />
              </div>
            </button>
          )}

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
                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-indigo-400 dark:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition"
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
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
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
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : 'text-slate-800 dark:text-slate-100 font-medium'
                }`}
              >
                {todo.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {formattedDate}
                </span>
                {todo.image_url && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                    <ImageIcon className="w-3 h-3" />
                    <span>Gambar terlampir</span>
                  </span>
                )}
              </div>
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
              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition"
              title="Edit todo"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isToggling}
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
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

      {/* Lightbox Modal untuk Preview Gambar Ukuran Penuh */}
      {showImagePreview && todo.image_url && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowImagePreview(false)}
        >
          <div
            className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate pr-4">
                {todo.title}
              </h3>
              <button
                type="button"
                onClick={() => setShowImagePreview(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-950/10 dark:bg-slate-950 p-2">
              <img
                src={todo.image_url}
                alt={todo.title}
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
