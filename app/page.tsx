'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import TodoItem, { Todo } from '@/components/TodoItem'
import ThemeToggle from '@/components/ThemeToggle'
import {
  CheckSquare,
  LogOut,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ListTodo,
  Loader2,
  AlertTriangle,
  Sparkles,
  Image as ImageIcon,
  X,
  Upload,
} from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<any>(null)
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [tableMissingError, setTableMissingError] = useState(false)

  // 1. Ambil session user saat ini
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)
      fetchTodos(user.id)
    }

    checkUser()
  }, [])

  // 2. Read / Fetch Todos
  const fetchTodos = async (userId: string) => {
    setLoading(true)
    setErrorMsg(null)
    setTableMissingError(false)

    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01' || error.message.includes('relation "public.todos" does not exist')) {
          setTableMissingError(true)
        } else {
          setErrorMsg(error.message)
        }
        return
      }

      setTodos(data || [])
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat daftar todo.')
    } finally {
      setLoading(false)
    }
  }

  // Pilih file gambar
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Hanya file gambar yang diperbolehkan.')
      return
    }

    // Maksimal 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran gambar maksimal 5MB.')
      return
    }

    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
    setErrorMsg(null)
  }

  const handleRemoveSelectedImage = () => {
    setSelectedImage(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 3. Create Todo dengan Lampiran Gambar ke Supabase Storage
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !user) return

    setAdding(true)
    setErrorMsg(null)

    let uploadedImageUrl: string | null = null

    try {
      // Unggah gambar ke Supabase Storage jika dipilih
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop() || 'jpg'
        const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = `${user.id}/${cleanFileName}`

        const { error: uploadError } = await supabase.storage
          .from('todo-images')
          .upload(filePath, selectedImage, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          throw new Error(
            `Gagal mengunggah gambar ke Storage: ${uploadError.message}. Pastikan bucket 'todo-images' sudah dibuat di Supabase Storage.`
          )
        }

        const { data: publicData } = supabase.storage
          .from('todo-images')
          .getPublicUrl(filePath)

        uploadedImageUrl = publicData.publicUrl
      }

      // Simpan ke database tabel todos
      const { data, error } = await supabase
        .from('todos')
        .insert([
          {
            title: newTitle.trim(),
            user_id: user.id,
            is_complete: false,
            image_url: uploadedImageUrl,
          },
        ])
        .select()
        .single()

      if (error) {
        if (error.code === '42P01' || error.message.includes('relation "public.todos" does not exist')) {
          setTableMissingError(true)
        } else {
          setErrorMsg(error.message)
        }
        return
      }

      if (data) {
        setTodos((prev) => [data, ...prev])
        setNewTitle('')
        handleRemoveSelectedImage()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan todo.')
    } finally {
      setAdding(false)
    }
  }

  // 4. Update Todo - Toggle Complete
  const handleToggleTodo = async (id: string, is_complete: boolean) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_complete })
        .eq('id', id)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_complete } : t))
      )
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah status todo.')
    }
  }

  // 5. Update Todo - Edit Title
  const handleEditTodo = async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ title })
        .eq('id', id)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, title } : t))
      )
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui judul todo.')
    }
  }

  // 6. Delete Todo
  const handleDeleteTodo = async (id: string) => {
    try {
      const { error } = await supabase.from('todos').delete().eq('id', id)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      setTodos((prev) => prev.filter((t) => t.id !== id))
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus todo.')
    }
  }

  // 7. Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Filter & Search Logic
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'active'
          ? !todo.is_complete
          : todo.is_complete

      const matchesSearch = todo.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase())

      return matchesFilter && matchesSearch
    })
  }, [todos, filter, searchQuery])

  // Stats
  const totalCount = todos.length
  const completedCount = todos.filter((t) => t.is_complete).length
  const activeCount = totalCount - completedCount
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Memeriksa autentikasi...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-8 px-4 sm:px-6 transition-colors duration-200">
      <div className="max-w-2xl mx-auto">
        {/* Header Bar */}
        <header className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 mb-6 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/30 shrink-0">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">TodoList App</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[170px] sm:max-w-xs" title={user?.email}>
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* Notifikasi Skema Supabase Belum Ada */}
        {tableMissingError && (
          <div className="mb-6 p-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-amber-900 dark:text-amber-200 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold">Tabel `todos` Belum Sesuai di Supabase</h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                  Tabel <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono">todos</code> atau kolom <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono">image_url</code> belum ditemukan.
                  Silakan buka <strong>Supabase Dashboard &gt; SQL Editor</strong> dan jalankan skrip terbaru dari file <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono">supabase/schema.sql</code>.
                </p>
                <button
                  onClick={() => user && fetchTodos(user.id)}
                  className="mt-3 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  Coba Refresh Lagi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between">
            <span className="pr-2">{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium shrink-0"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Progress Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 mb-6 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Progres Tugas</p>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {completedCount} dari {totalCount} selesai
              </h2>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{progressPercent}%</span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-0.5">
                <ListTodo className="w-3.5 h-3.5" />
                <span>Total</span>
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{totalCount}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs mb-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Aktif</span>
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{activeCount}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Selesai</span>
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{completedCount}</span>
            </div>
          </div>
        </div>

        {/* Form Tambah Todo dengan Upload Gambar */}
        <form onSubmit={handleAddTodo} className="mb-6 space-y-3">
          {/* Preview Gambar Sebelum Diunggah */}
          {imagePreview && (
            <div className="relative inline-block">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-md">
                <img
                  src={imagePreview}
                  alt="Preview lampiran"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveSelectedImage}
                  className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition shadow"
                  title="Hapus gambar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[150px]">
                {selectedImage?.name}
              </span>
            </div>
          )}

          <div className="flex gap-2 items-center">
            {/* Input Text Todo */}
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Tambahkan tugas baru..."
              disabled={adding}
              className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 dark:text-slate-100 text-sm shadow-sm transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />

            {/* Tombol Lampirkan Gambar */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={adding}
              className={`p-3 rounded-xl border transition flex items-center justify-center shrink-0 ${
                selectedImage
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title={selectedImage ? 'Ganti gambar terlampir' : 'Lampirkan gambar'}
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Tombol Submit Tambah */}
            <button
              type="submit"
              disabled={adding || !newTitle.trim()}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-indigo-200 dark:shadow-indigo-900/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
            >
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">
                    {selectedImage ? 'Mengunggah...' : 'Menyimpan...'}
                  </span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span className="hidden sm:inline">Tambah</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          {/* Tabs Filter */}
          <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'active'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Aktif ({activeCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'completed'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Selesai ({completedCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tugas..."
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* List Todos */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mb-2" />
              <p className="text-xs">Memuat daftar tugas...</p>
            </div>
          ) : filteredTodos.length > 0 ? (
            filteredTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggleTodo}
                onDelete={handleDeleteTodo}
                onEdit={handleEditTodo}
              />
            ))
          ) : (
            <div className="py-12 px-4 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {searchQuery
                  ? 'Tidak ada tugas yang cocok dengan pencarian'
                  : filter === 'completed'
                  ? 'Belum ada tugas yang selesai'
                  : filter === 'active'
                  ? 'Tidak ada tugas yang aktif'
                  : 'Belum ada tugas'}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                {searchQuery
                  ? 'Coba gunakan kata kunci pencarian yang berbeda.'
                  : 'Tulis tugas baru Anda pada formulir di atas untuk mulai produktif!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
